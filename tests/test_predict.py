import sys
import subprocess
import json
import pytest
from ml.src import config
from ml.src.predict import Predictor


def test_model_loads():
    predictor = Predictor.load()
    assert predictor.pipeline is not None
    assert predictor.card is not None
    assert "model_version" in predictor.card


def test_predict_output_schema():
    predictor = Predictor.load()
    sample_text = "The city council voted unanimously on Monday to approve the new annual infrastructure budget."
    result = predictor.predict(sample_text)

    assert isinstance(result, dict)
    assert "label" in result
    assert "fake_score" in result
    assert "model_version" in result


def test_fake_score_range():
    predictor = Predictor.load()
    sample_text = "Breaking news alert: unverified rumor spreads across social media channels."
    result = predictor.predict(sample_text)

    assert isinstance(result["fake_score"], float)
    assert 0.0 <= result["fake_score"] <= 1.0


def test_label_consistency():
    predictor = Predictor.load()
    sample_text = "Official press statement released by government officials regarding public transport schedules."
    result = predictor.predict(sample_text)

    if result["fake_score"] >= 0.5:
        assert result["label"] == config.LABEL_NAMES[config.FAKE]
    else:
        assert result["label"] == config.LABEL_NAMES[config.REAL]


def test_subprocess_predict():
    cmd = [
        sys.executable,
        "-c",
        "from ml.src.predict import Predictor; import json; p = Predictor.load(); print(json.dumps(p.predict('Subprocess test article content.')))",
    ]
    res = subprocess.run(cmd, cwd=config.ROOT, capture_output=True, text=True)

    assert res.returncode == 0, f"Subprocess failed with stderr: {res.stderr}"
    output = json.loads(res.stdout.strip())
    assert "label" in output
    assert "fake_score" in output
    assert "model_version" in output
