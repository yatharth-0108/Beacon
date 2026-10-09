# Backend API (FastAPI)

FastAPI web service serving the Fake News Detection model.

## Running the Server

Run Uvicorn from the **repository root** so module imports (`ml.src`, `backend.python`) resolve correctly:

```bash
uvicorn backend.python.main:app --reload --port 8000
```

Documentation and interactive Swagger UI are available at: `http://localhost:8000/docs`

## Endpoints Summary

- `GET /health`: Reports service status and whether the model is loaded in memory.
- `GET /model-info`: Returns model card metadata (`model_card.json`).
- `POST /predict`: Classifies news text.

### Example Request (`POST /predict`)

```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"text": "The city council voted unanimously on Monday to approve the new annual infrastructure budget for city parks and roads."}'
```

### Example Response (`200 OK`)

```json
{
  "label": "REAL",
  "fake_score": 0.1376,
  "model_version": "2026-09-28-lr-v1",
  "disclaimer": "Automated model prediction based on writing patterns; not a fact-check."
}
```
