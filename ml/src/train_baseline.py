import json
import pandas as pd
from sklearn.dummy import DummyClassifier
from ml.src import config
from ml.src.data import load_isot, train_test
from ml.src.pipeline import build_baseline
from ml.src.evaluate import evaluate, save_confusion_matrix_png


def main():
    print("Loading ISOT dataset...")
    df = load_isot()
    train_df, test_df = train_test(df)
    
    X_train, y_train = train_df["content"], train_df["label"]
    X_test, y_test = test_df["content"], test_df["label"]
    
    print(f"Train set: {len(X_train)} samples | Test set: {len(X_test)} samples")
    
    # 1. Majority-class baseline
    dummy = DummyClassifier(strategy="most_frequent")
    dummy.fit(X_train, y_train)
    dummy_preds = dummy.predict(X_test)
    dummy_metrics = evaluate(y_test, dummy_preds)
    
    # 2. Baseline Model: TF-IDF + Logistic Regression
    print("\nFitting baseline TF-IDF + LogisticRegression pipeline on train data...")
    pipeline = build_baseline()
    pipeline.fit(X_train, y_train)
    
    print("Evaluating model on test data...")
    model_preds = pipeline.predict(X_test)
    model_metrics = evaluate(y_test, model_preds)
    
    # 3. Display summary comparison table
    print("\n" + "=" * 65)
    print(f"{'Metric':<20} | {'Majority Baseline':<20} | {'TF-IDF + LogReg':<20}")
    print("=" * 65)
    for k in ["accuracy", "precision", "recall", "f1"]:
        print(f"{k.capitalize():<20} | {dummy_metrics[k]:<20.4f} | {model_metrics[k]:<20.4f}")
    print("=" * 65)
    
    # 4. Save metrics report JSON
    report = {
        "dataset": "ISOT",
        "train_samples": len(X_train),
        "test_samples": len(X_test),
        "majority_baseline": dummy_metrics,
        "tfidf_logreg_baseline": model_metrics
    }
    
    reports_dir = config.ROOT / "ml" / "reports"
    reports_dir.mkdir(parents=True, exist_ok=True)
    
    metrics_path = reports_dir / "baseline_metrics.json"
    with open(metrics_path, "w") as f:
        json.dump(report, f, indent=2)
    print(f"\nSaved metrics to {metrics_path}")
    
    # Save confusion matrix images
    cm_path1 = reports_dir / "baseline_confusion_matrix.png"
    cm_path2 = reports_dir / "figures" / "baseline_confusion_matrix.png"
    save_confusion_matrix_png(model_metrics["confusion_matrix"], cm_path1, title="ISOT Baseline Confusion Matrix")
    save_confusion_matrix_png(model_metrics["confusion_matrix"], cm_path2, title="ISOT Baseline Confusion Matrix")
    print(f"Saved confusion matrix plot to {cm_path1}")


if __name__ == "__main__":
    main()
