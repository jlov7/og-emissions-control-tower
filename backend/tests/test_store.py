from __future__ import annotations

from datetime import datetime, timezone


from app.store import CSVAppendResult, DataStore


def test_append_events_from_csv_adds_new_event(temp_store: DataStore) -> None:
    csv_payload = """id,site_id,detected_at_utc,detection_type,est_ch4_kgph,confidence,lat,lon,status
N900,S1,2025-09-25T12:00:00Z,satellite,450,0.7,29.7600,-95.3600,NEW
"""
    payload = csv_payload.encode("utf-8")
    result = temp_store.append_events_from_csv(payload)
    assert isinstance(result, CSVAppendResult)
    assert result.imported == 1
    assert result.skipped == 0

    created = temp_store.get_event("N900")
    assert created.est_ch4_kgph == 450
    assert created.status == "NEW"


def test_set_investigation_started_marks_event(temp_store: DataStore) -> None:
    now = datetime(2025, 9, 24, 15, 0, tzinfo=timezone.utc)
    updated = temp_store.set_investigation_started("E001", now)
    assert updated.status == "INVESTIGATING"
    assert updated.investigation_started_utc == now


def test_complete_runbook_item_logs_action(temp_store: DataStore) -> None:
    now = datetime(2025, 9, 24, 16, 0, tzinfo=timezone.utc)
    event, created = temp_store.complete_runbook_item("E001", "site-safety", now)
    assert created is True
    runbook_entries = event.notes.get("runbook_completed", [])
    assert any(entry.get("id") == "site-safety" for entry in runbook_entries)

    # Subsequent completion should be a no-op
    _, created_again = temp_store.complete_runbook_item("E001", "site-safety", now)
    assert created_again is False
