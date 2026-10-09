"""Consistency tests verifying that direct Predictor output matches API endpoints."""

import pytest
from fastapi.testclient import TestClient
from backend.python.main import app
from ml.src.predict import Predictor

SAMPLE_TEXTS = [
    "The Federal Reserve held interest rates steady on Wednesday while signalling it still expects to cut borrowing costs later this year.",
    "BREAKING: Secret government document leaked showing alien spacecraft recovered in Nevada desert!! Share before deleted!",
    "Scientists discover a new species of deep-sea jellyfish in the Pacific Ocean during a marine research expedition.",
    "Unbelievable shocker! You will not believe what celebrities are hiding from the public in this secret video!",
    "The local city council approved a $5 million budget allocation for public library upgrades and park maintenance.",
]


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


def test_predictor_vs_api_consistency(client):
    predictor = Predictor.load()

    for text in SAMPLE_TEXTS:
        direct_res = predictor.predict(text)

        response = client.post("/predict", json={"text": text})
        assert response.status_code == 200
        api_res = response.json()

        assert api_res["label"] == direct_res["label"]
        assert pytest.approx(api_res["fake_score"], abs=1e-5) == direct_res["fake_score"]
