import json
from pathlib import Path
import matplotlib.pyplot as plt
import seaborn as sns
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, confusion_matrix
from ml.src import config


def evaluate(y_true, y_pred) -> dict:
    """Computes evaluation metrics (accuracy, precision, recall, F1, confusion matrix) for FAKE class = 1."""
    acc = float(accuracy_score(y_true, y_pred))
    prec = float(precision_score(y_true, y_pred, pos_label=config.FAKE, zero_division=0))
    rec = float(recall_score(y_true, y_pred, pos_label=config.FAKE, zero_division=0))
    f1 = float(f1_score(y_true, y_pred, pos_label=config.FAKE, zero_division=0))
    cm = confusion_matrix(y_true, y_pred).tolist()
    
    return {
        "accuracy": acc,
        "precision": prec,
        "recall": rec,
        "f1": f1,
        "confusion_matrix": cm
    }


def save_confusion_matrix_png(cm: list, path: Path, title: str = "Confusion Matrix"):
    """Plots and saves confusion matrix heatmap as PNG."""
    path.parent.mkdir(parents=True, exist_ok=True)
    
    plt.figure(figsize=(5, 4))
    sns.heatmap(
        cm,
        annot=True,
        fmt="d",
        cmap="Blues",
        xticklabels=["REAL (0)", "FAKE (1)"],
        yticklabels=["REAL (0)", "FAKE (1)"]
    )
    plt.title(title)
    plt.xlabel("Predicted Label")
    plt.ylabel("True Label")
    plt.tight_layout()
    plt.savefig(path, dpi=150)
    plt.close()
