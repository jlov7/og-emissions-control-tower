from __future__ import annotations

import copy
import io
import json
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from threading import Lock
from typing import Dict, List, Optional, Tuple

import pandas as pd

from .schemas import ActionLogEntry, Asset, Event, RunbookItem

DEFAULT_DATA_DIR = Path(__file__).resolve().parent.parent / "data"


@dataclass
class CSVAppendResult:
    imported: int
    skipped: int


DEFAULT_RUNBOOK_TEMPLATE: List[RunbookItem] = [
    RunbookItem(
        id="site-safety",
        label="Confirm site safety and isolate equipment",
        completed=False,
    ),
    RunbookItem(
        id="quantify",
        label="Capture follow-up quantification reading",
        completed=False,
    ),
    RunbookItem(
        id="notify-ops",
        label="Notify operator and environmental lead",
        completed=False,
    ),
    RunbookItem(
        id="mitigation-plan",
        label="Draft mitigation & monitoring plan",
        completed=False,
    ),
]

DEFAULT_NOTES: Dict[str, List[Dict[str, str]]] = {
    "runbook_completed": [],
    "log": [],
}


class DataStore:
    """File-backed store for assets and methane events."""

    def __init__(self, data_dir: Path | None = None, runbook_template: Optional[List[RunbookItem]] = None) -> None:
        self._lock = Lock()
        self._data_dir = data_dir or DEFAULT_DATA_DIR
        self._assets_path = self._data_dir / "assets.csv"
        self._events_path = self._data_dir / "events.csv"
        self._runbook_template = runbook_template or DEFAULT_RUNBOOK_TEMPLATE

        if not self._assets_path.exists() or not self._events_path.exists():
            raise FileNotFoundError(
                "Expected data CSVs not found. Ensure assets.csv and events.csv are present in the data directory."
            )

        self._assets_df = pd.read_csv(self._assets_path)
        self._events_df = self._load_events()

    # ---------- Data loading utilities ----------
    def _load_events(self) -> pd.DataFrame:
        df = pd.read_csv(self._events_path)
        for column in ["detected_at_utc", "investigation_started_utc", "report_submitted_utc"]:
            df[column] = pd.to_datetime(df[column], utc=True, errors="coerce")
        df["notes"] = df["notes"].apply(self._deserialize_notes)
        return df

    @staticmethod
    def _deserialize_notes(value: object) -> Dict[str, List[Dict[str, str]]]:
        if isinstance(value, dict):
            notes = value
        else:
            text = "" if value is None else str(value)
            if not text or text == "nan":
                notes = {}
            else:
                try:
                    parsed = json.loads(text)
                    notes = parsed if isinstance(parsed, dict) else {"log": []}
                except json.JSONDecodeError:
                    notes = {"log": [{"message": text, "timestamp_utc": ""}]}
        normalized: Dict[str, List[Dict[str, str]]] = {
            "runbook_completed": [],
            "log": [],
        }
        for key in normalized.keys():
            items = notes.get(key, []) if isinstance(notes, dict) else []
            if isinstance(items, list):
                cleaned: List[Dict[str, str]] = []
                for item in items:
                    if isinstance(item, dict):
                        cleaned.append({k: str(v) for k, v in item.items()})
                normalized[key] = cleaned
        return normalized

    @staticmethod
    def _serialize_notes(value: Dict[str, List[Dict[str, str]]]) -> str:
        return json.dumps(value, ensure_ascii=False)

    @staticmethod
    def _ensure_aware(dt: Optional[datetime]) -> Optional[datetime]:
        if dt is None:
            return None
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)

    @staticmethod
    def _format_iso(dt: Optional[datetime]) -> str:
        if dt is None:
            return ""
        return DataStore._ensure_aware(dt).isoformat().replace("+00:00", "Z")

    @staticmethod
    def _parse_datetime(value: object) -> Optional[datetime]:
        if value is None:
            return None
        if isinstance(value, pd.Timestamp):
            if pd.isna(value):
                return None
            return value.to_pydatetime()
        if isinstance(value, datetime):
            return value
        if isinstance(value, str) and value:
            try:
                return datetime.fromisoformat(value.replace("Z", "+00:00"))
            except ValueError:
                return None
        return None

    # ---------- Public accessors ----------
    def list_assets(self) -> List[Asset]:
        return [Asset(**record) for record in self._assets_df.to_dict(orient="records")]

    def list_events(self) -> List[Event]:
        return [self._row_to_event(row) for _, row in self._events_df.iterrows()]

    def get_asset(self, site_id: str) -> Asset:
        match = self._assets_df[self._assets_df["site_id"].astype(str) == site_id]
        if match.empty:
            raise KeyError(f"Asset {site_id} not found")
        return Asset(**match.iloc[0].to_dict())

    def get_event(self, event_id: str) -> Event:
        match = self._events_df[self._events_df["id"].astype(str) == event_id]
        if match.empty:
            raise KeyError(f"Event {event_id} not found")
        return self._row_to_event(match.iloc[0])

    def _row_to_event(self, row: pd.Series) -> Event:
        data = row.to_dict()
        data["detected_at_utc"] = self._parse_datetime(row.get("detected_at_utc"))
        data["investigation_started_utc"] = self._parse_datetime(row.get("investigation_started_utc"))
        data["report_submitted_utc"] = self._parse_datetime(row.get("report_submitted_utc"))
        notes = row.get("notes") or {}
        data["notes"] = copy.deepcopy(notes)
        return Event(**data)  # type: ignore[arg-type]

    # ---------- Mutations ----------
    def set_investigation_started(self, event_id: str, timestamp: datetime) -> Event:
        timestamp = self._ensure_aware(timestamp)
        with self._lock:
            idx = self._locate_index(event_id)
            notes = copy.deepcopy(self._events_df.at[idx, "notes"]) or copy.deepcopy(DEFAULT_NOTES)
            notes.setdefault("log", []).append(
                {
                    "message": "Investigation started",
                    "timestamp_utc": self._format_iso(timestamp),
                }
            )
            self._events_df.at[idx, "status"] = "INVESTIGATING"
            self._events_df.at[idx, "investigation_started_utc"] = timestamp
            self._events_df.at[idx, "notes"] = notes
            self._persist_events()
            return self.get_event(event_id)

    def set_report_submitted(self, event_id: str, timestamp: datetime) -> Event:
        timestamp = self._ensure_aware(timestamp)
        with self._lock:
            idx = self._locate_index(event_id)
            notes = copy.deepcopy(self._events_df.at[idx, "notes"]) or copy.deepcopy(DEFAULT_NOTES)
            notes.setdefault("log", []).append(
                {
                    "message": "Report submitted",
                    "timestamp_utc": self._format_iso(timestamp),
                }
            )
            self._events_df.at[idx, "status"] = "REPORTED"
            self._events_df.at[idx, "report_submitted_utc"] = timestamp
            self._events_df.at[idx, "notes"] = notes
            self._persist_events()
            return self.get_event(event_id)

    def complete_runbook_item(self, event_id: str, item_id: str, timestamp: datetime) -> Tuple[Event, bool]:
        timestamp = self._ensure_aware(timestamp)
        with self._lock:
            idx = self._locate_index(event_id)
            notes = copy.deepcopy(self._events_df.at[idx, "notes"]) or copy.deepcopy(DEFAULT_NOTES)
            completed_entries = notes.setdefault("runbook_completed", [])
            if any(entry.get("id") == item_id for entry in completed_entries):
                return self.get_event(event_id), False
            completed_entries.append(
                {
                    "id": item_id,
                    "timestamp_utc": self._format_iso(timestamp),
                }
            )
            notes.setdefault("log", []).append(
                {
                    "message": f"Runbook item completed: {item_id}",
                    "timestamp_utc": self._format_iso(timestamp),
                }
            )
            self._events_df.at[idx, "notes"] = notes
            self._persist_events()
            return self.get_event(event_id), True

    def append_events_from_csv(self, file_bytes: bytes) -> CSVAppendResult:
        buffer = io.StringIO(file_bytes.decode("utf-8"))
        incoming = pd.read_csv(buffer)
        required = {
            "id",
            "site_id",
            "detected_at_utc",
            "detection_type",
            "est_ch4_kgph",
            "confidence",
            "lat",
            "lon",
            "status",
        }
        if missing := required - set(incoming.columns):
            raise ValueError(f"Missing required columns: {', '.join(sorted(missing))}")

        for column in ["detected_at_utc", "investigation_started_utc", "report_submitted_utc"]:
            if column in incoming.columns:
                incoming[column] = pd.to_datetime(incoming[column], utc=True, errors="coerce")
            else:
                incoming[column] = None
        if "notes" not in incoming.columns:
            incoming["notes"] = [{} for _ in range(len(incoming))]

        imported = 0
        skipped = 0

        with self._lock:
            existing_ids = set(self._events_df["id"].astype(str).tolist())
            rows_to_add: List[Dict[str, object]] = []
            for _, row in incoming.iterrows():
                event_id = str(row["id"])
                if event_id in existing_ids:
                    skipped += 1
                    continue
                row_dict = row.to_dict()
                row_dict["id"] = event_id
                row_dict["notes"] = self._deserialize_notes(row_dict.get("notes"))
                rows_to_add.append(row_dict)
                existing_ids.add(event_id)
                imported += 1
            if rows_to_add:
                additions = pd.DataFrame(rows_to_add)
                self._events_df = pd.concat([self._events_df, additions], ignore_index=True)
                self._persist_events()

        return CSVAppendResult(imported=imported, skipped=skipped)

    # ---------- Derived views ----------
    def build_runbook(self, event: Event) -> List[RunbookItem]:
        notes = event.notes or copy.deepcopy(DEFAULT_NOTES)
        completed_lookup = {
            entry.get("id"): entry.get("timestamp_utc")
            for entry in notes.get("runbook_completed", [])
        }
        runbook_items: List[RunbookItem] = []
        for template_item in self._runbook_template:
            completed_at = completed_lookup.get(template_item.id)
            runbook_items.append(
                RunbookItem(
                    id=template_item.id,
                    label=template_item.label,
                    completed=completed_at is not None,
                    completed_at_utc=self._parse_datetime(completed_at) if completed_at else None,
                )
            )
        return runbook_items

    def build_action_log(self, event: Event) -> List[ActionLogEntry]:
        entries: List[ActionLogEntry] = []
        for raw in (event.notes or {}).get("log", []):
            ts = self._parse_datetime(raw.get("timestamp_utc"))
            entries.append(
                ActionLogEntry(
                    message=raw.get("message", ""),
                    timestamp_utc=ts or datetime.now(timezone.utc),
                )
            )
        if event.investigation_started_utc:
            entries.append(
                ActionLogEntry(
                    message="Investigation started",
                    timestamp_utc=self._ensure_aware(event.investigation_started_utc),
                )
            )
        if event.report_submitted_utc:
            entries.append(
                ActionLogEntry(
                    message="Report submitted",
                    timestamp_utc=self._ensure_aware(event.report_submitted_utc),
                )
            )
        entries.sort(key=lambda item: item.timestamp_utc)
        return entries

    # ---------- Helpers ----------
    def _locate_index(self, event_id: str) -> int:
        match = self._events_df.index[self._events_df["id"].astype(str) == event_id]
        if len(match) == 0:
            raise KeyError(f"Event {event_id} not found")
        return int(match[0])

    def _persist_events(self) -> None:
        df = self._events_df.copy()
        for column in ["detected_at_utc", "investigation_started_utc", "report_submitted_utc"]:
            df[column] = df[column].apply(self._format_iso)
        df["notes"] = df["notes"].apply(self._serialize_notes)
        df.to_csv(self._events_path, index=False)


store = DataStore()
