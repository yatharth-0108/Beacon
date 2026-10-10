import pytest
import urllib.request
import urllib.error
import json
import io
from PIL import Image

BASE_URL = "http://localhost:4000/api/predict"


def post_json(endpoint, data):
    req = urllib.request.Request(
        endpoint,
        data=json.dumps(data).encode("utf-8"),
        headers={"Content-Type": "application/json"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        return resp.status, json.loads(resp.read().decode())


def test_regression_cancer_hot_water_claim():
    """Test Case A: False health claim about hot water destroying cancer cells."""
    claim = "Drinking hot water every morning destroys cancer cells throughout the body without affecting healthy tissue."
    status, res = post_json(BASE_URL, {"text": claim})
    assert status == 200
    assert res["label"] in ["CONTRADICTED", "UNCERTAIN", "INSUFFICIENT EVIDENCE", "FAKE"]
    assert res["label"] != "REAL"
    assert res["fake_score"] >= 0.50


def test_regression_bleach_virus_cure():
    """Test Case B: False medical misinformation about drinking bleach."""
    claim = "Drinking household bleach cures viral infections and is safer than conventional medical treatment."
    status, res = post_json(BASE_URL, {"text": claim})
    assert status == 200
    assert res["label"] in ["CONTRADICTED", "FAKE"]
    assert res["fake_score"] > 0.80


def test_regression_moon_sunlight_reflection():
    """Test Case C: True scientific fact about moon reflectivity."""
    claim = "The Moon is visible because its surface reflects sunlight."
    status, res = post_json(BASE_URL, {"text": claim})
    assert status == 200
    assert res["label"] in ["SUPPORTED", "REAL"]
    assert res["fake_score"] < 0.20


def test_regression_authentic_news_article():
    """Test Case D: Real journalistic article text."""
    article = (
        "WASHINGTON (Reuters) - The U.S. Senate voted overwhelmingly on Thursday to pass a bipartisan "
        "budget agreement, sending the measure to the White House for the President's signature. "
        "Lawmakers from both parties praised the compromise, which funds defense and domestic programs "
        "through the end of the fiscal year without triggering automatic spending cuts."
    )
    status, res = post_json(BASE_URL, {"text": article})
    assert status == 200
    assert res["label"] == "REAL"
    assert res["fake_score"] < 0.45


def test_regression_sensational_fabricated_news():
    """Test Case E: Fabricated sensational conspiracy text."""
    fake_text = (
        "BREAKING EXCLUSIVE: Secret underground military tribunal convicts top shadow government officials "
        "in emergency midnight trial! Mainstream media completely blacked out this shocking revelation, "
        "but whistleblowers have leaked the full unredacted files! SHARE THIS BEFORE IT GETS TAKEN DOWN!"
    )
    status, res = post_json(BASE_URL, {"text": fake_text})
    assert status == 200
    assert res["label"] in ["FAKE", "CONTRADICTED"]
    assert res["fake_score"] > 0.50


def test_regression_url_inaccessible():
    """Test Case F: Inaccessible / malformed URL handling."""
    with pytest.raises(urllib.error.HTTPError) as exc_info:
        post_json(f"{BASE_URL}/url", {"url": "https://this-domain-does-not-exist-xyz-987.com/news"})
    assert exc_info.value.code == 422


def test_regression_image_upload():
    """Test Case G: Multi-factor image prediction pipeline."""
    img = Image.new("RGB", (200, 200), color=(100, 140, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=90)
    img_bytes = buf.getvalue()

    boundary = "----RegressionBoundary123"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="photo.jpg"\r\n'
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode("utf-8") + img_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/image",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with urllib.request.urlopen(req, timeout=10) as resp:
        assert resp.status == 200
        res = json.loads(resp.read().decode())
        assert "prediction" in res
        assert "confidence" in res


def test_regression_chandrayaan3_soft_landing():
    """Phase 4 Regression: Chandrayaan-3 soft landing factual verification."""
    article = (
        "India's Chandrayaan-3 mission achieved a soft landing on the Moon on 23 August 2023. "
        "The mission included the Vikram lander and Pragyan rover and marked a major milestone for India's space programme."
    )
    status, res = post_json(BASE_URL, {"text": article})
    assert status == 200
    assert res["label"] == "SUPPORTED"
    assert res["verdict"] == "SUPPORTED"
    assert res["fake_score"] < 0.10
    assert res["confidence"] >= 0.90
    assert any("isro.gov.in" in s.get("url", "") or "wikipedia.org" in s.get("url", "") for s in res.get("sources", []))
    assert len(res.get("claim_results", [])) > 0
    assert all(c.get("status") == "SUPPORTED" for c in res.get("claim_results", []))


def test_regression_corrupted_image():
    """Phase 8/9: Ensure corrupted or invalid image returns clear client error (400/502)."""
    boundary = "----RegressionBoundaryCorrupt"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="image"; filename="corrupted.jpg"\r\n'
        f"Content-Type: image/jpeg\r\n\r\n"
    ).encode("utf-8") + b"NOT_A_VALID_JPEG_HEADER" + f"\r\n--{boundary}--\r\n".encode("utf-8")

    req = urllib.request.Request(
        f"{BASE_URL}/image",
        data=body,
        headers={"Content-Type": f"multipart/form-data; boundary={boundary}"}
    )
    with pytest.raises(urllib.error.HTTPError) as exc_info:
        urllib.request.urlopen(req, timeout=10)
    assert exc_info.value.code in [400, 422, 502]


def test_regression_ambiguous_short_rumor():
    """Phase 6/9: Short ambiguous unverified claim returns UNCERTAIN / INSUFFICIENT EVIDENCE."""
    claim = "Secret negotiations took place yesterday between rival ministers in an undisclosed cafe."
    status, res = post_json(BASE_URL, {"text": claim})
    assert status == 200
    assert res["label"] in ["UNCERTAIN", "INSUFFICIENT EVIDENCE"]
    assert res["fake_score"] == 0.5
    assert res["confidence"] == 0.5


def test_regression_ssrf_internal_ip_blocked():
    """Phase 7/9: Ensure SSRF protection blocks private network and localhost URLs."""
    with pytest.raises(urllib.error.HTTPError) as exc_info:
        post_json(f"{BASE_URL}/url", {"url": "http://127.0.0.1:8000/health"})
    assert exc_info.value.code == 422

