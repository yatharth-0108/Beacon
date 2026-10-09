import json
import platform
from datetime import datetime, timezone
import joblib
import sklearn
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score

from ml.src import config, data
from ml.src.pipeline import build_final_pipeline


def train_and_save():
    """Trains final model pipeline (P2_LR), evaluates performance, serializes artifact,
    and exports model_card.json metadata.
    
    Why: Training on the train split, evaluating on the held-out test and cross-dataset benchmark,
    and persisting the entire Pipeline guarantees train-serve consistency and prevents test leakage.
    """
    print("Loading datasets for final training...")
    isot_df = data.load_isot()
    train_df, test_df = data.train_test(isot_df)
    kaggle_df = data.load_second()

    print(f"Training on ISOT split ({len(train_df)} rows)...")
    pipeline = build_final_pipeline()
    pipeline.fit(train_df["content"], train_df["label"])

    print("Evaluating on in-domain test set...")
    test_preds = pipeline.predict(test_df["content"])
    test_acc = accuracy_score(test_df["label"], test_preds)
    test_prec = precision_score(test_df["label"], test_preds, pos_label=config.FAKE)
    test_rec = recall_score(test_df["label"], test_preds, pos_label=config.FAKE)
    test_f1 = f1_score(test_df["label"], test_preds, pos_label=config.FAKE)

    print("Evaluating on cross-dataset (Kaggle)...")
    kaggle_preds = pipeline.predict(kaggle_df["content"])
    cross_acc = accuracy_score(kaggle_df["label"], kaggle_preds)
    cross_prec = precision_score(kaggle_df["label"], kaggle_preds, pos_label=config.FAKE)
    cross_rec = recall_score(kaggle_df["label"], kaggle_preds, pos_label=config.FAKE)
    cross_f1 = f1_score(kaggle_df["label"], kaggle_preds, pos_label=config.FAKE)

    # Ensure models directory exists
    config.MODELS_DIR.mkdir(parents=True, exist_ok=True)
    pipeline_path = config.MODELS_DIR / "pipeline.joblib"
    joblib.dump(pipeline, pipeline_path)
    print(f"Saved trained pipeline to {pipeline_path}")

    # Build model card JSON
    today_str = datetime.now().strftime("%Y-%m-%d")
    model_card = {
        "model_version": f"{today_str}-lr-v1",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset": "ISOT Fake News Dataset (with Kaggle Fake/Real evaluation)",
        "n_train": len(train_df),
        "n_test": len(test_df),
        "classifier": "LogisticRegression",
        "params": {
            "max_features": 50000,
            "max_iter": 1000,
            "random_state": config.RANDOM_STATE,
            "clean_text": True,
        },
        "metrics_in_domain": {
            "accuracy": round(float(test_acc), 4),
            "precision": round(float(test_prec), 4),
            "recall": round(float(test_rec), 4),
            "f1": round(float(test_f1), 4),
        },
        "metrics_cross_dataset": {
            "accuracy": round(float(cross_acc), 4),
            "precision": round(float(cross_prec), 4),
            "recall": round(float(cross_rec), 4),
            "f1": round(float(cross_f1), 4),
        },
        "sklearn_version": sklearn.__version__,
        "python_version": platform.python_version(),
    }

    card_path = config.MODELS_DIR / "model_card.json"
    with open(card_path, "w") as f:
        json.dump(model_card, f, indent=2)
    print(f"Saved model card metadata to {card_path}")

    print("\n--- Final Model Training Summary ---")
    print(f"Model Version: {model_card['model_version']}")
    print(f"In-Domain Test F1: {test_f1:.4f} (Acc: {test_acc:.4f})")
    print(f"Cross-Dataset F1: {cross_f1:.4f} (Acc: {cross_acc:.4f})")


if __name__ == "__main__":
    train_and_save()
