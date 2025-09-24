from __future__ import annotations

from datetime import datetime, timedelta, timezone

from app.schemas import Event
from app.triage import evaluate_event


def make_event(**overrides) -> Event:
    base = {
        "id": "TEST",
        "site_id": "S1",
        "detected_at_utc": datetime.now(timezone.utc),
        "detection_type": "satellite",
        "est_ch4_kgph": 900.0,
        "confidence": 0.85,
        "lat": 29.76,
        "lon": -95.36,
        "status": "NEW",
        "investigation_started_utc": None,
        "report_submitted_utc": None,
        "notes": {},
    }
    base.update(overrides)
    return Event(**base)


def test_high_severity_recent_event_scores_high() -> None:
    now = datetime(2025, 9, 24, tzinfo=timezone.utc)
    event = make_event(detected_at_utc=now - timedelta(hours=4))
    score, bucket, breakdown, *_ = evaluate_event(event, now=now)
    assert bucket == "HIGH"
    assert score >= 0.7
    assert breakdown.recency_boost >= 0.15


def test_older_low_rate_event_scores_lower() -> None:
    now = datetime(2025, 10, 1, tzinfo=timezone.utc)
    event = make_event(
        est_ch4_kgph=120.0,
        confidence=0.4,
        detection_type="continuous",
        detected_at_utc=now - timedelta(days=10),
    )
    score, bucket, breakdown, *_ = evaluate_event(event, now=now)
    assert bucket == "LOW"
    assert score < 0.4
    assert breakdown.recency_boost == 0.0
