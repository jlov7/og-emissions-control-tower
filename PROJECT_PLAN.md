# Project Plan: OG Emissions Control Tower

## Objectives
- Deliver a Codespaces-ready demo that showcases methane event triage, SLA tracking, and PDF exports without external API keys.
- Provide a FastAPI backend with synthetic data ingestion/storage and a Next.js/Tailwind frontend with mapping UI.
- Implement stretch goals: CSV import, triage explanation tooltip, status filters, runbook checklist, and theme toggle.

## Milestones
1. **Environment Setup**: Devcontainer, Makefile, base repo structure, shared documentation.
2. **Backend Delivery**: Data store, triage engine, REST API, PDF generation, CSV ingestion.
3. **Frontend Experience**: Map view, event list & drawer, SLA indicators, stretch UX enhancements.
4. **Quality & Docs**: README, usage guides, verification steps, polish.

## Work Breakdown
- **Backend**
  - Define Pydantic schemas and triage scoring logic.
  - Implement data store with CSV persistence helpers.
  - Expose FastAPI routes for assets, events, lifecycle updates, CSV import, and PDF export.
  - Generate PDF reports via fpdf2 with SLA compliance summary.
- **Frontend**
  - Scaffold Next.js 14 app with Tailwind and MapLibre.
  - Create reusable UI primitives (chips, toolbar, list cards, drawer, runbook panel).
  - Implement data hooks for events/assets, SLA countdowns, PDF trigger, CSV upload.
  - Add stretch features: triage explainer tooltip, status tabs, theme toggle.
- **Operations**
  - Configure Makefile workflows and README instructions for Codespaces/local usage.
  - Produce task tracking and PR draft markdown artifacts.
  - Ensure accessibility & contrast standards and no key dependencies.

## Risks & Mitigations
- **MapLibre build issues**: pin dependencies and validate on Node 20 via devcontainer.
- **CSV persistence conflicts**: centralize writes through store helpers and lock via pandas operations.
- **PDF layout regressions**: render deterministic sections with consistent fonts.

## Verification Checklist
- [ ] `uvicorn` serves API with triage data & SLA fields _(pending manual run)_.
- [ ] Frontend loads events, map markers, filters, and runbook actions _(pending manual run)_.
- [ ] CSV upload adds events and UI refresh reflects new data _(pending manual run)_.
- [ ] PDF download opens correct summary _(pending manual run)_.
- [ ] Dark/light theme toggles styling harmoniously _(pending manual run)_.
- [ ] README instructions validated for Codespaces + local runs _(pending manual run)_.
