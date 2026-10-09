# AGENTS.md: rules for AI coding agents

> **Path note**: Project documents are directly inside `Documents/`. Code paths (`ml/`, `backend/node/`, `backend/python/`, `frontend/`, `tests/`) are relative to the project root.

You are helping build a Fake News Detection app (React + FastAPI + scikit-learn). The human is a student learning while building. Optimise for **working, verifiable, understandable** code.

## Read order (every new session)

1. This file
2. `README.md` for setup and current features
3. `Documents/ARCHITECTURE.md` and `Documents/SRS.md` for contracts
4. `Documents/PROGRESS.md` and `Documents/PHASES.md` for project history

## Working rules

- Keep changes scoped to the request. Avoid unrelated features or broad refactors.
- Run relevant tests and build/startup checks. Never claim success without fresh verification.
- **Never invent metrics.** All numbers in reports and docs must come from code you ran. If something can't be run, say so.
- Run Python from the repo root. Use module form: `python -m ml.src.train`.
- Add a dependency only if needed; add it to `requirements.txt` with a one-line reason in `Documents/DECISIONS.md`.
- Do not commit datasets, `.venv`, `node_modules`, or `.env`. Model artifacts are gitignored; `model_card.json` and `ml/reports/` are committed.
- Fixed `random_state=42` everywhere. Fit anything (vectorizer, scalers) on **training data only**.
- Keep code small, typed where cheap, with short docstrings. No clever abstractions.
- If requirements conflict with reality (dataset differs, library API changed), stop and ask the human, then record the decision in `Documents/DECISIONS.md`.

## Teaching rule (the human is learning)

When a request introduces a substantial new concept, explain it plainly and add a short note to `Documents/LEARNING_LOG.md` when appropriate.
When you write non-obvious code (TF-IDF settings, pipeline, CORS), add a comment saying _why_.

## Contracts (never change without a `DECISIONS.md` entry)

- Label encoding: `FAKE = 1`, `REAL = 0` (defined once in `ml/src/config.py`).
- Model artifact: a single sklearn `Pipeline` saved to `ml/models/pipeline.joblib`.
- API: prediction and application contracts are documented in `Documents/ARCHITECTURE.md`.

## End-of-phase checklist

- [ ] Relevant tests and startup paths verified
- [ ] `Documents/PROGRESS.md` or `Documents/DECISIONS.md` updated when warranted

## Agent-human protocol

## Handoff expectations

Summarize changes and fresh verification results. Ask the user only for actions that genuinely require them, and never claim an unverified result.
