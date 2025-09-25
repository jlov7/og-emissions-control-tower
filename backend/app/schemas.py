from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Literal, Optional

from pydantic import BaseModel, Field


DetectionType = Literal["satellite", "OGI", "continuous"]
EventStatus = Literal["NEW", "INVESTIGATING", "REPORTED"]


class Asset(BaseModel):
    site_id: str
    site_name: str
    operator: str
    lat: float
    lon: float


class TriageBreakdown(BaseModel):
    base_severity: float = Field(..., ge=0.0, le=1.0)
    detection_weight: float
    confidence: float = Field(..., ge=0.0, le=1.0)
    recency_boost: float
    score: float = Field(..., ge=0.0, le=1.0)
    components: Dict[str, float]
    computed_at_utc: datetime


class ActionLogEntry(BaseModel):
    message: str
    timestamp_utc: datetime


class RunbookItem(BaseModel):
    id: str
    label: str
    completed: bool
    completed_at_utc: Optional[datetime] = None


class Event(BaseModel):
    id: str
    site_id: str
    detected_at_utc: datetime
    detection_type: DetectionType
    est_ch4_kgph: float
    confidence: float
    lat: float
    lon: float
    status: EventStatus
    investigation_started_utc: Optional[datetime] = None
    report_submitted_utc: Optional[datetime] = None
    notes: Dict[str, List[Dict[str, str]]] = Field(default_factory=dict)


class EventOut(Event):
    asset: Asset
    triage_score: float
    triage_bucket: Literal["LOW", "MED", "HIGH"]
    triage_breakdown: TriageBreakdown
    sla_investigate_deadline_utc: datetime
    sla_report_deadline_utc: datetime
    sla_investigate_remaining_h: float
    sla_report_remaining_h: float
    sla_investigate_breached: bool
    sla_report_breached: bool
    action_log: List[ActionLogEntry]
    runbook: List[RunbookItem]


class EventsResponse(BaseModel):
    events: List[EventOut]




class RunbookCompletionRequest(BaseModel):
    item_id: str = Field(..., min_length=1)


class CSVImportResult(BaseModel):
    imported: int
    skipped: int
    message: str


class AIRequest(BaseModel):
    focus: Optional[str] = Field(None, description="Optional focus area for the assistant (e.g. 'communications').")


class AIResponse(BaseModel):
    model: str
    content: str
    usage: Optional[Dict[str, Any]] = None

