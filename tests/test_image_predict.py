import io
import pytest
import numpy as np
from PIL import Image, ImageDraw
from ml.src.image_predict import ImagePredictor


@pytest.fixture
def predictor():
    return ImagePredictor.load()


def test_image_model_loads(predictor):
    assert predictor.pipeline is not None
    assert predictor.card is not None
    assert "model_version" in predictor.card


def test_valid_jpeg(predictor):
    img = Image.new("RGB", (200, 200), (120, 150, 180))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    res = predictor.predict(buf.getvalue(), "sample.jpg")

    assert res["success"] is True
    assert res["prediction"] in ["REAL", "FAKE"]
    assert 0.0 <= res["confidence"] <= 1.0
    assert 0.0 <= res["fake_score"] <= 1.0


def test_valid_png_and_rgba(predictor):
    # Test RGBA with alpha transparency
    img = Image.new("RGBA", (150, 150), (255, 100, 50, 200))
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    res = predictor.predict(buf.getvalue(), "graphic.png")

    assert res["success"] is True
    assert res["prediction"] in ["REAL", "FAKE"]


def test_valid_webp(predictor):
    img = Image.new("RGB", (300, 200), (90, 180, 90))
    buf = io.BytesIO()
    img.save(buf, format="WEBP")
    res = predictor.predict(buf.getvalue(), "web_image.webp")

    assert res["success"] is True
    assert res["image_dimensions"] == "300x200"


def test_grayscale_image(predictor):
    img = Image.new("L", (180, 180), 128)
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    res = predictor.predict(buf.getvalue(), "gray.jpg")

    assert res["success"] is True
    assert res["prediction"] in ["REAL", "FAKE"]


def test_different_aspect_ratios(predictor):
    # Ultra-wide landscape
    img_wide = Image.new("RGB", (800, 200), (70, 70, 70))
    buf_wide = io.BytesIO()
    img_wide.save(buf_wide, format="JPEG")
    res_wide = predictor.predict(buf_wide.getvalue(), "wide.jpg")
    assert res_wide["success"] is True

    # Tall portrait
    img_tall = Image.new("RGB", (200, 800), (80, 80, 80))
    buf_tall = io.BytesIO()
    img_tall.save(buf_tall, format="JPEG")
    res_tall = predictor.predict(buf_tall.getvalue(), "tall.jpg")
    assert res_tall["success"] is True


def test_corrupted_image_raises_error(predictor):
    corrupt_bytes = b"NOT_A_REAL_IMAGE_FILE_DATA_123456"
    with pytest.raises(ValueError):
        predictor.predict(corrupt_bytes, "bad.jpg")


def test_too_small_image_raises_error(predictor):
    tiny_img = Image.new("RGB", (8, 8), (0, 0, 0))
    buf = io.BytesIO()
    tiny_img.save(buf, format="PNG")
    with pytest.raises(ValueError):
        predictor.predict(buf.getvalue(), "tiny.png")
