from __future__ import annotations

import io
from typing import Iterator

import pytest
from fastapi.testclient import TestClient

from app import main as main_module
from app.main import _build_event_out
from app.pdf import generate_event_report_pdf


@pytest.fixture()
def api_client(temp_store, monkeypatch) -> Iterator[TestClient]:
    """Provide a TestClient wired to a temporary datastore."""
    monkeypatch.setattr(main_module, "store", temp_store)
    with TestClient(main_module.app) as client:
        yield client


def test_get_assets_and_events(api_client: TestClient) -> None:
    assets_response = api_client.get("/api/assets")
    assert assets_response.status_code == 200
    assets = assets_response.json()
    assert any(asset["site_id"] == "S1" for asset in assets)

    events_response = api_client.get("/api/events")
    assert events_response.status_code == 200
    payload = events_response.json()
    assert "events" in payload and len(payload["events"]) > 0


def test_event_lifecycle_and_pdf(api_client: TestClient, temp_store) -> None:
    events = api_client.get("/api/events").json()["events"]
    event_id = events[0]["id"]

    investigate_response = api_client.post(f"/api/events/{event_id}/investigate")
    assert investigate_response.status_code == 200
    assert investigate_response.json()["status"] == "INVESTIGATING"

    runbook_response = api_client.post(
        f"/api/events/{event_id}/runbook", json={"item_id": "site-safety"}
    )
    assert runbook_response.status_code == 200
    assert any(item["completed"] for item in runbook_response.json()["runbook"])

    report_response = api_client.post(f"/api/events/{event_id}/report")
    assert report_response.status_code == 200
    assert report_response.json()["status"] == "REPORTED"

    pdf_response = api_client.get(f"/api/events/{event_id}/report.pdf")
    assert pdf_response.status_code == 200
    assert pdf_response.headers["content-type"].startswith("application/pdf")
    assert "report_" in pdf_response.headers["content-disposition"]

    event = temp_store.get_event(event_id)
    report_payload = _build_event_out(temp_store, event)
    pdf_bytes = generate_event_report_pdf(report_payload)
    assert pdf_bytes.startswith(b"%PDF")


def test_csv_import(api_client: TestClient) -> None:
    csv_payload = (
        "id,site_id,detected_at_utc,detection_type,est_ch4_kgph,confidence,lat,lon,status\n"
        "N950,S2,2025-09-26T00:00:00Z,satellite,330,0.8,29.4200,-98.4900,NEW\n"
    ).encode("utf-8")

    response = api_client.post(
        "/api/events/import",
        files={"file": ("batch.csv", io.BytesIO(csv_payload), "text/csv")},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["imported"] == 1
    assert data["skipped"] == 0

    events_after = api_client.get("/api/events").json()["events"]
    assert any(event["id"] == "N950" for event in events_after)
