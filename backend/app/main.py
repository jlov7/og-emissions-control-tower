from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import Body, FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse

from .pdf import generate_event_report_pdf
from .schemas import (
    Asset,
    CSVImportResult,
    Event,
    EventOut,
    EventStatus,
    EventsResponse,
    RunbookCompletionRequest,
    AIRequest,
    AIResponse,
)
from .store import DataStore, CSVAppendResult, store
from . import ai
from .triage import evaluate_event

app = FastAPI(title="OG Emissions Control Tower Demo", version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
    allow_credentials=False,
)


def _build_event_out(store: DataStore, event: Event) -> EventOut:
    asset = store.get_asset(event.site_id)
    (
        triage_score,
        triage_bucket,
        breakdown,
        investigate_deadline,
        report_deadline,
        investigate_remaining_h,
        report_remaining_h,
    ) = evaluate_event(event)

    action_log = store.build_action_log(event)
    runbook = store.build_runbook(event)

    return EventOut(
        **event.model_dump(),
        asset=asset,
        triage_score=triage_score,
        triage_bucket=triage_bucket,
        triage_breakdown=breakdown,
        sla_investigate_deadline_utc=investigate_deadline,
        sla_report_deadline_utc=report_deadline,
        sla_investigate_remaining_h=investigate_remaining_h,
        sla_report_remaining_h=report_remaining_h,
        sla_investigate_breached=investigate_remaining_h < 0,
        sla_report_breached=report_remaining_h < 0,
        action_log=action_log,
        runbook=runbook,
    )


@app.get("/api/assets", response_model=List[Asset])
def get_assets() -> List[Asset]:
    return store.list_assets()


@app.get("/api/events", response_model=EventsResponse)
def get_events(
    status: Optional[EventStatus] = None,
    sla_breached_only: bool = False,
) -> EventsResponse:
    events = store.list_events()
    filtered: List[EventOut] = []
    for event in events:
        if status and event.status != status:
            continue
        event_out = _build_event_out(store, event)
        if sla_breached_only and not (
            event_out.sla_investigate_breached or event_out.sla_report_breached
        ):
            continue
        filtered.append(event_out)
    return EventsResponse(events=filtered)


@app.get("/api/events/{event_id}", response_model=EventOut)
def get_event_detail(event_id: str) -> EventOut:
    try:
        event = store.get_event(event_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _build_event_out(store, event)


@app.post("/api/events/{event_id}/investigate", response_model=EventOut)
def start_investigation(event_id: str) -> EventOut:
    try:
        updated = store.set_investigation_started(event_id, datetime.now(timezone.utc))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _build_event_out(store, updated)


@app.post("/api/events/{event_id}/report", response_model=EventOut)
def submit_report(event_id: str) -> EventOut:
    try:
        updated = store.set_report_submitted(event_id, datetime.now(timezone.utc))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _build_event_out(store, updated)


@app.post("/api/events/{event_id}/runbook", response_model=EventOut)
def complete_runbook_item(event_id: str, payload: RunbookCompletionRequest) -> EventOut:
    try:
        updated, _ = store.complete_runbook_item(event_id, payload.item_id, datetime.now(timezone.utc))
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    return _build_event_out(store, updated)


@app.post("/api/events/import", response_model=CSVImportResult)
async def import_events(file: UploadFile = File(...)) -> CSVImportResult:
    if not file.filename.endswith(".csv"):
        raise HTTPException(status_code=400, detail="Only CSV uploads are supported")
    content = await file.read()
    try:
        result: CSVAppendResult = store.append_events_from_csv(content)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CSVImportResult(
        imported=result.imported,
        skipped=result.skipped,
        message=f"Imported {result.imported} event(s); skipped {result.skipped} duplicate(s)",
    )




@app.post('/api/events/{event_id}/assistant', response_model=AIResponse)
def get_event_assistant(event_id: str, payload: AIRequest | None = Body(default=None)) -> AIResponse:
    if not ai.ai_client.is_configured:
        raise HTTPException(status_code=503, detail='AI assistant is unavailable in this environment.')
    try:
        event = store.get_event(event_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    event_out = _build_event_out(store, event)
    focus = payload.focus if payload else None
    try:
        result = ai.ai_client.generate_event_brief(event_out, focus=focus)
    except ai.AIUnavailable as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    return AIResponse(model=result.model, content=result.content, usage=result.usage)

@app.get("/api/events/{event_id}/report.pdf")
def download_event_report(event_id: str) -> StreamingResponse:
    try:
        event = store.get_event(event_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    payload = _build_event_out(store, event)
    pdf_bytes = generate_event_report_pdf(payload)
    file_name = f"report_{event_id}.pdf"
    return StreamingResponse(
        iter([pdf_bytes]),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f"attachment; filename={file_name}",
        },
    )


@app.get("/healthz")
def healthcheck() -> dict[str, str]:
    return {"status": "ok"}
