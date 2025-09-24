from __future__ import annotations

from datetime import datetime, timedelta, timezone
from typing import Dict, Tuple

from .schemas import Event, TriageBreakdown


DETECTION_WEIGHTS: Dict[str, float] = {
    "satellite": 1.0,
    "OGI": 0.8,
    "continuous": 0.6,
}


def _ensure_aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(timezone.utc)


def _compute_recency_boost(detected_at: datetime, now: datetime) -> float:
    age_hours = (now - detected_at).total_seconds() / 3600
    if age_hours < 48:
        return 0.15
    if age_hours < 96:
        return 0.05
    return 0.0


def evaluate_event(event: Event, now: datetime | None = None) -> Tuple[float, str, TriageBreakdown, datetime, datetime, float, float]:
    """Return triage metrics and SLA deadlines for an event."""
    now = _ensure_aware(now or datetime.now(timezone.utc))
    detected_at = _ensure_aware(event.detected_at_utc)

    base_severity = min(event.est_ch4_kgph / 1000.0, 1.0)
    detection_weight = DETECTION_WEIGHTS.get(event.detection_type, 0.6)
    recency_boost = _compute_recency_boost(detected_at, now)

    severity_component = base_severity * detection_weight * 0.7
    confidence_component = event.confidence * 0.2

    raw_score = severity_component + confidence_component + recency_boost
    triage_score = max(0.0, min(1.0, raw_score))

    if triage_score >= 0.7:
        triage_bucket = "HIGH"
    elif triage_score >= 0.4:
        triage_bucket = "MED"
    else:
        triage_bucket = "LOW"

    investigate_deadline = detected_at + timedelta(days=5)
    report_deadline = detected_at + timedelta(days=15)

    investigate_remaining_h = (investigate_deadline - now).total_seconds() / 3600
    report_remaining_h = (report_deadline - now).total_seconds() / 3600

    breakdown = TriageBreakdown(
        base_severity=round(base_severity, 3),
        detection_weight=round(detection_weight, 3),
        confidence=round(event.confidence, 3),
        recency_boost=round(recency_boost, 3),
        score=round(triage_score, 3),
        components={
            "severity_component": round(severity_component, 3),
            "confidence_component": round(confidence_component, 3),
            "recency_component": round(recency_boost, 3),
        },
        computed_at_utc=now,
    )

    return (
        triage_score,
        triage_bucket,
        breakdown,
        investigate_deadline,
        report_deadline,
        investigate_remaining_h,
        report_remaining_h,
    )
