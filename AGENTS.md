# Repository Guidelines

## Project Structure & Module Organization
- `backend/`: FastAPI service (`main.py`, `app/` for API, services, schemas, database).
- `backend/data/`: SQLite database and uploads (`data/database`, `data/upload`).
- `frontend/`: Next.js app (App Router) with UI in `frontend/app/`, static assets in `frontend/public/`.
- Root scripts: `run-backend.ps1`, `run-frontend.ps1`, `run-all.ps1` for local startup.

## Build, Test, and Development Commands
- `pwsh run-backend.ps1`: start the FastAPI server via `uv run uvicorn`.
- `pwsh run-frontend.ps1`: start the Next.js dev server.
- `pwsh run-all.ps1`: run backend (background) + frontend (foreground) together.
- `cd backend; uv sync`: install Python deps from `backend/pyproject.toml`.
- `cd frontend; npm install`: install frontend deps.
- `cd frontend; npm run dev`: Next.js dev server (same as script).
- `cd frontend; npm run build`: production build.
- `cd frontend; npm run lint`: Next.js ESLint checks.

## Coding Style & Naming Conventions
- Python: 4-space indentation, PEP 8 naming (`snake_case` functions/modules, `PascalCase` classes).
- TypeScript/React: follow Next.js/ESLint defaults; `PascalCase` components, `camelCase` props/hooks.
- Prefer existing patterns in `backend/app/` services and `frontend/app/` routes.

## Testing Guidelines
- No automated test runner is configured in this repo yet.
- Manual verification: use FastAPI docs at `http://localhost:8000/docs` and the UI at `http://localhost:3000`.
- If you add tests, document the command in this file and place them under `backend/test/` or a new `frontend` test folder.

## Commit & Pull Request Guidelines
- Current commit history uses short, lowercase subjects (often 1–2 words) without prefixes. Follow that style unless asked otherwise.
- PRs should include:
  - Clear summary of changes.
  - Steps to verify (commands or manual checks).
  - Screenshots for UI changes.
  - Notes on config/env changes (e.g., updates to `.env.example`).

## Configuration & Secrets
- Backend configuration lives in `backend/.env` (copy from `backend/.env.example`).
- Do not commit secrets; update `.env.example` when adding new env vars.
