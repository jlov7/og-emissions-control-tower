# OG Emissions Control Tower (Demo)

A Codespaces-ready, API-key-free demo that brings methane detections into a single "control tower" so you can triage, track SLAs, and export audit-ready PDFs. FastAPI powers the backend, while a Next.js 14 + Tailwind UI visualizes events on a MapLibre map with rich filters, runbook tracking, and dark mode.

## Highlights
- **Synthetic methane detections** with deterministic triage scoring, SLA timers (5-day investigate / 15-day report), and action logs.
- **FastAPI backend** that serves assets/events, updates lifecycle states, appends CSV uploads, and renders fpdf2 reports.
- **Next.js frontend** featuring MapLibre markers, triage tooltips, SLA chips, status tabs, CSV importer, runbook checklist, theme toggle, and a built-in welcome tour.
- **Audit-ready PDFs** summarizing site context, scoring rationale, SLA compliance, runbook progress, and action history.
- **No external keys** – fully self-contained for Codespaces or local development.

## Stack
- Backend: FastAPI, Pandas, fpdf2 (Python 3.11)
- Frontend: Next.js 14, React 18, Tailwind CSS, MapLibre GL, date-fns
- Tooling: Devcontainer (Node 20 + Python 3.11), Makefile orchestration

## Codespaces Quickstart
1. Launch a new Codespace on this repo (default machine size is fine).
2. Wait for the green toast—setup installs Python/Node deps automatically.
3. The `make dev` task starts the servers; if it stops, rerun `make dev`.
4. Open the forwarded ports: http://localhost:3000 (app) and http://localhost:8000/docs (API).

## Local Development
1. **Install prerequisites:** Python 3.11, Node.js 20, npm.
2. Clone the repo and install dependencies:
   ```bash
   pip install -r backend/requirements.txt
   cd frontend && npm install
   ```
3. From the project root run:
   ```bash
   make dev
   ```
   This launches the FastAPI backend on `0.0.0.0:8000` and the Next.js app on `0.0.0.0:3000`. Stop with `Ctrl+C`.

### Handy Commands
```bash
make dev         # backend + frontend together
make backend     # FastAPI only
make frontend    # Next.js only
make lint        # Frontend ESLint rules
make type-check  # Frontend TypeScript checks
make test        # Backend pytest quick checks
```

## Using the Demo
- **Explore the map:** Markers are colored by triage bucket (High red, Med orange, Low yellow). Selecting a card or marker syncs the map, list, and detail drawer—use the summary callouts to jump straight into problem events.
- **Triage insight:** Hover or focus the triage chip to see the scoring breakdown (CH₄ rate, detection weight, confidence, recency boost).
- **Guided onboarding:** Launch the in-app guide anytime via the toolbar to recap the key workflows.
- **SLA focus:** Toggle the "SLA breaches only" filter or inspect the SLA chips (green = on track, red = breached).
- **Status tabs:** Jump between NEW / INVESTIGATING / REPORTED workflows.
- **Runbook checklist:** Within the detail drawer, mark "What to check" items. Each completion is logged and appears in the PDF.
- **Lifecycle updates:** Use **Start Investigation** (investigation timestamp + status) and **Mark Reported** (report timestamp + status).
- **Generate audit PDF:** Click **Generate PDF** to download `/tmp/report_[id].pdf` content directly from the backend.
- **Import more detections:** Use the **Import CSV** button to append events. A ready-made sample lives at [`/samples/demo_events_batch.csv`](frontend/public/samples/demo_events_batch.csv).
- **Theme toggle:** Switch between light and dark via the toolbar.

> Frontend requests proxy through the Next.js dev server at `/backend/*`, so browsers always talk to the same origin. When you deploy the frontend separately, set `NEXT_PUBLIC_API_BASE` to your backend’s `/api` base (for example `https://api.example.com/api`).

## API Reference
All endpoints live under `http://localhost:8000/api`.
- `GET /assets` – list assets with coordinates.
- `GET /events` – list events plus triage metrics, SLA timers, runbook state, and action log.
- `GET /events/{id}` – single event detail.
- `POST /events/{id}/investigate` – mark as INVESTIGATING and stamp `investigation_started_utc`.
- `POST /events/{id}/report` – mark as REPORTED and stamp `report_submitted_utc`.
- `POST /events/{id}/runbook` – complete a runbook checklist item (`{"item_id": "site-safety"}`).
- `POST /events/import` – multipart CSV upload; skips duplicates and persists to disk.
- `GET /events/{id}/report.pdf` – stream audit-ready PDF.


## AI assistant (Codespaces)
- The backend automatically uses the built-in `GITHUB_TOKEN` that Codespaces injects to access the free tier of GitHub Models.
- From the event drawer, click **AI briefing** to generate response steps using `github/gpt-4.1-mini`.
- Outside of Codespaces (or without a token), the button gracefully reports that the assistant is unavailable.
- Set `GITHUB_MODELS_MODEL` or `GITHUB_MODELS_KEY` if you want to point at a different hosted model or paid deployment.
- When the frontend runs outside Codespaces, set both `NEXT_PUBLIC_API_BASE` (pointing to your backend `/api` base) and the appropriate `GITHUB_MODELS_*` token if you want AI briefings to continue working.

## Sample & Testing
- **Sample CSV:** `/frontend/public/samples/demo_events_batch.csv` is linked directly from the toolbar for quick uploads.
- **Backend tests:** `make test` runs the pytest smoke suite (triage math, CSV ingestion, runbook logging).

## Data & Extensibility
- Seed CSVs live in `backend/data/`. New CSV uploads persist back to `events.csv` via Pandas.
- Runbook templates are defined in `backend/app/store.py` (`RUNBOOK_TEMPLATE`) and can be tailored per site.
- Triage weights reside in `backend/app/triage.py`; tweak detection weights or thresholds as needed.

## Notes & Disclaimers
- Demo uses synthetic data for advisory purposes only and performs no control writes.
- No external network calls or API keys required; everything runs locally/codespace.
- Generated PDFs are stored temporarily (`/tmp/report_[id].pdf`) during creation before streaming to the browser.

### Quick How-To Recap
1. Open http://localhost:3000.
2. Select an event, click **Start Investigation**, then **Generate PDF**.
3. Review backend docs at http://localhost:8000/docs for deeper API exploration.

Enjoy exploring the OG Emissions Control Tower demo!
