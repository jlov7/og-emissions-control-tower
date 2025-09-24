# PR Draft: OG Emissions Control Tower Demo

## Summary
- [x] Implemented FastAPI backend with triage scoring, SLA timers, runbook logging, CSV ingestion, and PDF exports.
- [x] Delivered Next.js + Tailwind frontend with MapLibre view, filters, runbook checklist, CSV import, and dark mode.
- [x] Added devcontainer, Makefile, and README guidance for Codespaces and local workflows.
- [x] Added pytest smoke tests, reusable frontend API client, and a downloadable CSV sample batch for quick demos.

## Testing
- [ ] Backend endpoints return expected payloads (`uvicorn app.main:app --reload` + manual curl/UI checks).
- [ ] Frontend renders map markers and drawer interactions (`npm run dev`).
- [x] CSV import updates events list and persists to storage (`make test`).
- [x] PDF reports generate without errors (`make test` covers log + manual).

## Screenshots / Media
- Add when available.

## Notes
- Synthetic data only; no external API keys needed.
