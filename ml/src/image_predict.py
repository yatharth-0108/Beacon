import io
import json
import logging
from typing import Dict, Any, Union
from PIL import Image
import joblib
import numpy as np

from ml.src import config
from ml.src.image_model import DeepForensicsExtractor

logger = logging.getLogger("image_predictor")


class ImagePredictor:
    """Trained multi-stream Image Forensics & AI Generation Predictor.
    Loads calibrated classifier and DeepForensicsExtractor to evaluate
    Error Level Analysis, 2D FFT spectral roll-off, and spatial noise properties.
    """

    SUPPORTED_FORMATS = {"JPEG", "JPG", "PNG", "WEBP"}

    def __init__(self, pipeline, card: Dict[str, Any]):
        self.pipeline = pipeline
        self.card = card
        self.extractor = DeepForensicsExtractor()

    @classmethod
    def load(cls):
        """Loads the trained image model artifact and model card."""
        pipeline_path = config.MODELS_DIR / "image_pipeline.joblib"
        card_path = config.MODELS_DIR / "image_model_card.json"

        if not pipeline_path.exists():
            # Lazy train if not yet saved
            from ml.src.train_image_model import train_and_evaluate
            train_and_evaluate()

        pipeline = joblib.load(pipeline_path)
        card = json.loads(card_path.read_text()) if card_path.exists() else {"model_version": "2026-10-09-image-gbdt-v2"}
        return cls(pipeline, card)

    def preprocess_image(self, image_bytes: bytes) -> Image.Image:
        """Validates and opens image bytes using PIL."""
        try:
            img = Image.open(io.BytesIO(image_bytes))
            img.verify()
            img = Image.open(io.BytesIO(image_bytes))
            return self.extractor.preprocess(img)
        except Exception as e:
            raise ValueError(f"Invalid or unreadable image: {str(e)}")

    def predict(self, image_bytes: bytes, filename: str = "image.jpg") -> Dict[str, Any]:
        """Runs multi-stream feature extraction and trained model inference on uploaded image bytes."""
        img = self.preprocess_image(image_bytes)
        width, height = img.size

        if width < 16 or height < 16:
            raise ValueError("Image dimensions are too small for analysis (min 16x16 required).")

        # Extract multi-factor forensic feature vector
        feature_vec, meta = self.extractor.extract_feature_vector(img)

        # Run trained model pipeline
        proba = self.pipeline.predict_proba([feature_vec])[0]
        # Class 1 = FAKE (Manipulated / AI), Class 0 = REAL (Authentic Photo / Graphic)
        fake_score = float(proba[1])
        is_fake = fake_score >= 0.50

        # Calculate calibrated confidence
        confidence = round(fake_score if is_fake else (1.0 - fake_score), 4)
        label = "FAKE" if is_fake else "REAL"

        # Diagnose specific detection reason
        if is_fake:
            if meta.get("ela_block_variance", 0) > 40.0:
                diagnosis = "Local compression disparity indicates spliced composite manipulation or Photoshop tampering."
            elif meta.get("spectral_ratio", 0) < 0.25:
                diagnosis = "High-frequency spectral decay and unnatural gradient smoothing indicate AI generative synthesis (Diffusion/GAN)."
            else:
                diagnosis = "Compression anomalies and abnormal spatial noise patterns detected."
        else:
            if meta.get("is_clean_graphic", 0) > 0.5:
                diagnosis = f"Authentic digital graphic/logo ({filename}). Vector structure and clean uniform rasterization verified."
            else:
                diagnosis = "Optical noise consistency, sensor pattern, and compression history are consistent with authentic camera media."

        return {
            "success": True,
            "prediction": label,
            "confidence": confidence,
            "fake_score": round(fake_score, 4),
            "image_dimensions": f"{width}x{height}",
            "filename": filename,
            "message": diagnosis,
            "model_version": self.card.get("model_version", "2026-10-09-image-gbdt-v2"),
        }
