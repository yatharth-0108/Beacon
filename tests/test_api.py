import pytest
from fastapi.testclient import TestClient
from backend.python.main import app
from ml.src import config


def test_health_endpoint():
    with TestClient(app) as client:
        response = client.get("/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "ok"
        assert data["model_loaded"] is True


def test_model_info_endpoint():
    with TestClient(app) as client:
        response = client.get("/model-info")
        assert response.status_code == 200
        data = response.json()
        assert "model_version" in data
        assert "classifier" in data


def test_predict_valid_input():
    with TestClient(app) as client:
        valid_text = "The city council voted on Monday to approve the new annual infrastructure budget for city parks."
        response = client.post("/predict", json={"text": valid_text})
        assert response.status_code == 200
        data = response.json()
        assert data["label"] in ["FAKE", "REAL"]
        assert 0.0 <= data["fake_score"] <= 1.0
        assert "model_version" in data
        assert "disclaimer" in data


def test_predict_invalid_inputs():
    with TestClient(app) as client:
        # 1. Empty string
        res = client.post("/predict", json={"text": ""})
        assert res.status_code == 422

        # 2. Short string (< MIN_TEXT_CHARS)
        res = client.post("/predict", json={"text": "Short text"})
        assert res.status_code == 422

        # 3. Whitespace-only string
        res = client.post("/predict", json={"text": "                    "})
        assert res.status_code == 422

        # 4. Oversized string (> MAX_TEXT_CHARS)
        over_text = "a" * (config.MAX_TEXT_CHARS + 1)
        res = client.post("/predict", json={"text": over_text})
        assert res.status_code == 422

        # 5. Missing field
        res = client.post("/predict", json={})
        assert res.status_code == 422

        # 6. Wrong data type
        res = client.post("/predict", json={"text": 12345})
        assert res.status_code == 422


def test_predict_missing_model():
    with TestClient(app) as client:
        app.state.predictor = None
        res = client.post("/predict", json={"text": "Sample valid text for testing when model is missing."})
        assert res.status_code == 503
        assert "Model not available" in res.json()["detail"]
