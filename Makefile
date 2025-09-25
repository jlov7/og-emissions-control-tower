PYTHON ?= python3
PIP ?= pip

.PHONY: dev backend frontend lint type-check requirements test

dev:
	@echo "Launching FastAPI (8000) and Next.js (3000). Press Ctrl+C to stop."
	@bash -c "trap 'kill 0' EXIT; \
		(cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload) & \
		(cd frontend && npm run dev -- --hostname 0.0.0.0 --port 3000); \
		wait"

backend:
	@cd backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

frontend:
	@cd frontend && npm run dev -- --hostname 0.0.0.0 --port 3000

lint:
	@cd frontend && npm run lint

type-check:
	@cd frontend && npm run type-check

requirements:
	@$(PIP) install -r backend/requirements.txt


test:
	@cd backend && PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 pytest
