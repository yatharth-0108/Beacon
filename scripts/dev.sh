#!/usr/bin/env bash
# Start the prediction API, application API, and frontend together.

trap 'kill 0' EXIT

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "Starting FastAPI prediction service on http://localhost:8000..."
.venv/bin/python -m uvicorn backend.python.main:app --port 8000 &

echo "Starting Express application API on http://localhost:4000..."
(cd backend/node && npm run dev) &

echo "Starting React frontend on http://localhost:5173..."
(cd frontend && npm run dev) &

wait
