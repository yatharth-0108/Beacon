# Model Selection Justification

## Selected Final Model: `P2_LR` (`clean_text` + TF-IDF Unigrams + Logistic Regression)

### Selection Criteria Evaluation
1. **Cross-Dataset Generalization:**
   - `P2_LR` achieves a strong cross-dataset F1 score of **69.13%** on the unseen Kaggle dataset after explicitly stripping publisher leakage artifacts (`(Reuters)`, `via`, URLs, twitter links, @handles).
   - While `P1_LR` (raw text) achieved 69.63%, it relies directly on publisher artifacts like `(Reuters)` which exist only in ISOT real news and cause severe real-world data leakage.

2. **In-Domain Cross-Validation Performance:**
   - 5-fold Stratified CV F1 mean: **97.70% (+/- 0.29%)** on ISOT training set.
   - Test split F1 score: **97.62%** (Accuracy: **97.84%**, Precision: **98.44%**, Recall: **96.82%**).

3. **Simplicity and Efficiency:**
   - Training time is fast (~39 seconds for full training + CV), and model complexity is low.
   - Unigram TF-IDF (`max_features=50,000`) keeps vector memory light and inference latency low (< 5ms per article).

4. **Probability Calibration (`predict_proba`):**
   - Logistic Regression natively outputs calibrated class probability predictions via the sigmoid function, satisfying API requirements for confidence scores.
   - LinearSVC (`P2_SVM`) achieved similar performance but lacks native `predict_proba` without requiring expensive probability calibration (`CalibratedClassifierCV`).

### Decision
`P2_LR` is selected as the production model pipeline. It will be serialized to `ml/models/pipeline.joblib` in Phase 5.
