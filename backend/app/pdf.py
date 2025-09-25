from __future__ import annotations

from datetime import datetime
from typing import List

from fpdf import FPDF

from .schemas import ActionLogEntry, EventOut, RunbookItem


def _format_dt(dt: datetime | None) -> str:
    if dt is None:
        return "N/A"
    return dt.strftime("%Y-%m-%d %H:%M UTC")


def _format_hours(hours: float) -> str:
    if hours is None:
        return "N/A"
    days = hours / 24
    if abs(days) >= 1:
        return f"{days:.1f} d"
    return f"{hours:.1f} h"


def _sla_status(remaining: float) -> str:
    return "Breached" if remaining < 0 else "On Track"


def generate_event_report_pdf(event: EventOut) -> bytes:
    pdf = FPDF()
    pdf.set_auto_page_break(auto=True, margin=15)
    pdf.add_page()

    pdf.set_font("Helvetica", "B", 20)
    pdf.cell(0, 12, f"Emissions Event Report - {event.id}", ln=True, align="C")
    pdf.ln(4)

    pdf.set_font("Helvetica", "", 12)
    pdf.multi_cell(0, 6, "Demo report using synthetic data only.", align="C")
    pdf.ln(4)

    # Event & Site Summary
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "Event Overview", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        textwrap(
            [
                ("Site", event.asset.site_name),
                ("Operator", event.asset.operator),
                ("Location", f"{event.asset.lat:.4f}, {event.asset.lon:.4f}"),
                ("Detection Type", event.detection_type.upper()),
                ("Detected", _format_dt(event.detected_at_utc)),
                ("Estimated CH4", f"{event.est_ch4_kgph:.0f} kg/h"),
                ("Confidence", f"{event.confidence:.2f}"),
            ]
        ),
    )
    pdf.ln(2)

    # Triage summary
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "Triage Summary", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        (
            f"Score: {event.triage_score:.2f} ({event.triage_bucket})\n"
            f"Base severity: {event.triage_breakdown.base_severity:.2f}\n"
            f"Detection weight: {event.triage_breakdown.detection_weight:.2f}\n"
            f"Confidence component: {event.triage_breakdown.confidence:.2f}\n"
            f"Recency boost: {event.triage_breakdown.recency_boost:.2f}"
        ),
    )
    pdf.ln(2)

    # SLA table
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "SLA Status", ln=True)
    pdf.set_font("Helvetica", "", 11)
    pdf.multi_cell(
        0,
        6,
        (
            f"Investigate by: {_format_dt(event.sla_investigate_deadline_utc)}\n"
            f"Status: {_sla_status(event.sla_investigate_remaining_h)} ({_format_hours(event.sla_investigate_remaining_h)} remaining)\n"
            f"Report by: {_format_dt(event.sla_report_deadline_utc)}\n"
            f"Status: {_sla_status(event.sla_report_remaining_h)} ({_format_hours(event.sla_report_remaining_h)} remaining)"
        ),
    )
    pdf.ln(2)

    # Runbook checklist
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "Runbook Checklist", ln=True)
    pdf.set_font("Helvetica", "", 11)
    if event.runbook:
        for item in event.runbook:
            status = "[x]" if item.completed else "[ ]"
            timestamp = _format_dt(item.completed_at_utc)
            pdf.cell(0, 6, f"{status} {item.label} ({timestamp})", ln=True)
    else:
        pdf.cell(0, 6, "No runbook items recorded.", ln=True)
    pdf.ln(2)

    # Action log
    pdf.set_font("Helvetica", "B", 14)
    pdf.cell(0, 8, "Action Log", ln=True)
    pdf.set_font("Helvetica", "", 11)
    if event.action_log:
        for entry in event.action_log:
            pdf.multi_cell(0, 6, f"{_format_dt(entry.timestamp_utc)} - {entry.message}")
            pdf.ln(1)
    else:
        pdf.cell(0, 6, "No follow-up actions logged yet.", ln=True)

    pdf.set_y(-25)
    pdf.set_font("Helvetica", "I", 9)
    pdf.multi_cell(0, 5, "Demo only - synthetic data. Not for operational use.", align="C")

    output = pdf.output(dest="S")
    if isinstance(output, str):
        return output.encode("latin1")
    return bytes(output)


def textwrap(rows: List[tuple[str, str]]) -> str:
    return "\n".join(f"{label}: {value}" for label, value in rows)
