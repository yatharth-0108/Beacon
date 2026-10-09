# Data Leakage and Generalization Report

## 1. Top Features and Identified Artifacts (Baseline Model)
When trained on the raw ISOT dataset, the Logistic Regression model heavily relied on publisher-specific artifacts rather than the actual meaning of the news content.

**Top artifacts found in FAKE news:**
- `video`, `via`, `image`, `featured`, `getty`, `images`, `pic`, `https`
- Example: "featured image via John Doe. 21st Century Wire says..."

**Top artifacts found in REAL news:**
- `reuters`, `washington`, `wednesday`, `tuesday`, `thursday`, `friday`, `edt`, `nov`
- Example: "WASHINGTON (Reuters) - "

These features represent spurious correlations. Because ISOT was constructed by crawling specific publishers (like Reuters for REAL news, and various specific blogs for FAKE news), the model learned to identify the publisher instead of detecting fake news.

## 2. Artifact Removal Strategy
We implemented a `clean_text` function in `ml/src/preprocess.py` to strip these artifacts before TF-IDF vectorization:
1. Removed leading dateline/agency tags (e.g. `WASHINGTON (Reuters) - `).
2. Removed any standalone `(Reuters)` or `reuters`.
3. Removed URLs and Twitter picture links (`http...`, `pic.twitter.com/...`).
4. Removed Twitter handles (`@handle`).
5. Removed specific phrases found exclusively in FAKE samples (`featured image via`, `21st century wire`, `getty images`).

## 3. Cross-Dataset Evaluation Results

We evaluated the model both on the ISOT test set (in-domain) and the Kaggle Fake or Real News dataset (cross-dataset generalization).

| Model | ISOT test F1 | Second-dataset F1 | Drop |
|---|---|---|---|
| baseline | 0.9807 | 0.6963 | -0.2844 |
| cleaned | 0.9762 | 0.6913 | -0.2849 |

### Analysis of the Generalization Drop
As expected, there is a massive drop in performance (from ~98% down to ~69% F1) when moving from the ISOT dataset to the Kaggle Second dataset. 

**Why the drop?**
- **Domain Shift:** Different datasets collect articles from different time periods, topics, and authors.
- **Different Publishers:** The second dataset does not use the exact same publishers, meaning the artifacts the model learned on ISOT (even after our light cleaning) do not exist in the second dataset.
- **Memorization vs Generalization:** The high 98% score on ISOT was an illusion caused by data leakage. The ~69% score on the completely unseen dataset is a much more honest representation of the model's true ability to detect fake news across different environments.
