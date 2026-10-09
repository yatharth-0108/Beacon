import argparse
import time
import pandas as pd
from sklearn.model_selection import StratifiedKFold, cross_val_score
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
from sklearn.linear_model import LogisticRegression
from sklearn.naive_bayes import MultinomialNB
from sklearn.svm import LinearSVC

from ml.src import config, data
from ml.src.pipeline import build_pipeline


def run_experiments(single_run: bool = False):
    """Runs experiment grid comparing preprocessing options and classifiers.
    
    Why: Evaluating model variants using 5-fold cross-validation on the training set
    and cross-dataset generalization on an independent dataset ensures we select
    a model that generalizes beyond dataset-specific artifacts without leaking test data.
    """
    print("Loading datasets...")
    isot_df = data.load_isot()
    train_df, test_df = data.train_test(isot_df)
    kaggle_df = data.load_second()

    print(f"Train split: {len(train_df)} rows | Test split: {len(test_df)} rows | Kaggle set: {len(kaggle_df)} rows")

    # Define Preprocessing Grid
    prep_grid = {
        "P1": {"clean": False, "ngram_range": (1, 1), "stop_words": None, "min_df": 1},
        "P2": {"clean": True, "ngram_range": (1, 1), "stop_words": None, "min_df": 1},
        "P3": {"clean": True, "ngram_range": (1, 2), "stop_words": None, "min_df": 3},
        "P4": {"clean": True, "ngram_range": (1, 1), "stop_words": "english", "min_df": 1},
    }

    # Define Classifiers Grid
    clf_grid = {
        "LR": LogisticRegression(max_iter=1000, random_state=config.RANDOM_STATE),
        "NB": MultinomialNB(),
        "SVM": LinearSVC(random_state=config.RANDOM_STATE),
    }

    results = []
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=config.RANDOM_STATE)

    for prep_id, prep_params in prep_grid.items():
        for clf_id, clf in clf_grid.items():
            combo_id = f"{prep_id}_{clf_id}"
            if single_run and combo_id != "P1_LR":
                continue

            print(f"\nEvaluating combination: {combo_id} ...")
            start_time = time.time()

            pipeline = build_pipeline(
                clean=prep_params["clean"],
                ngram_range=prep_params["ngram_range"],
                stop_words=prep_params["stop_words"],
                min_df=prep_params["min_df"],
                classifier=clf,
            )

            # 5-fold Stratified CV on training set
            cv_f1_scores = cross_val_score(
                pipeline,
                train_df["content"],
                train_df["label"],
                cv=skf,
                scoring="f1",
                n_jobs=-1,
            )

            # Fit on full training set
            pipeline.fit(train_df["content"], train_df["label"])
            fit_time = time.time() - start_time

            # Evaluate on held-out in-domain test set
            test_preds = pipeline.predict(test_df["content"])
            test_acc = accuracy_score(test_df["label"], test_preds)
            test_prec = precision_score(test_df["label"], test_preds, pos_label=config.FAKE)
            test_rec = recall_score(test_df["label"], test_preds, pos_label=config.FAKE)
            test_f1 = f1_score(test_df["label"], test_preds, pos_label=config.FAKE)

            # Evaluate on cross-dataset (Kaggle)
            kaggle_preds = pipeline.predict(kaggle_df["content"])
            cross_f1 = f1_score(kaggle_df["label"], kaggle_preds, pos_label=config.FAKE)

            res = {
                "combo_id": combo_id,
                "prep_id": prep_id,
                "clf_id": clf_id,
                "cv_f1_mean": round(cv_f1_scores.mean(), 4),
                "cv_f1_std": round(cv_f1_scores.std(), 4),
                "test_acc": round(test_acc, 4),
                "test_prec": round(test_prec, 4),
                "test_rec": round(test_rec, 4),
                "test_f1": round(test_f1, 4),
                "cross_dataset_f1": round(cross_f1, 4),
                "fit_time_sec": round(fit_time, 2),
            }
            results.append(res)
            print(f"  CV F1: {res['cv_f1_mean']:.4f} +/- {res['cv_f1_std']:.4f} | Test F1: {res['test_f1']:.4f} | Cross-Dataset F1: {res['cross_dataset_f1']:.4f} | Time: {res['fit_time_sec']}s")

    results_df = pd.DataFrame(results)

    if not single_run:
        config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
        csv_path = config.REPORTS_DIR / "experiments.csv"
        results_df.sort_values(by=["cross_dataset_f1", "cv_f1_mean"], ascending=False, inplace=True)
        results_df.to_csv(csv_path, index=False)
        print(f"\nExperiment grid completed. Results saved to {csv_path}")
        print("\n--- Summary (sorted by Cross-Dataset F1) ---")
        print(results_df.to_string(index=False))

    return results_df


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Phase 4 Experiment Grid.")
    parser.add_argument("--single", action="store_true", help="Run single combination (P1_LR) for verification.")
    args = parser.parse_args()

    run_experiments(single_run=args.single)
