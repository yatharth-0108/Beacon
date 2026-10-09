import json
import joblib
from ml.src import config


class Predictor:
    """Inference predictor wrapping the trained scikit-learn Pipeline and model card metadata.
    
    Why: Loading the model artifact once at startup and looking up class indices dynamically
    guarantees low-latency predictions and avoids hardcoded index assumptions during serving.
    """
    def __init__(self, pipeline, card):
        self.pipeline = pipeline
        self.card = card

    @classmethod
    def load(cls):
        path = config.MODELS_DIR / "pipeline.joblib"
        if not path.exists():
            raise FileNotFoundError(f"Model not found at {path}. Run: python -m ml.src.train")
        card = json.loads((config.MODELS_DIR / "model_card.json").read_text())
        return cls(joblib.load(path), card)

    def predict(self, text: str) -> dict:
        score = float(self.pipeline.predict_proba([text])[0][list(self.pipeline.classes_).index(config.FAKE)])
        label = config.LABEL_NAMES[config.FAKE if score >= 0.5 else config.REAL]
        return {
            "label": label,
            "fake_score": round(score, 4),
            "model_version": self.card["model_version"],
        }
