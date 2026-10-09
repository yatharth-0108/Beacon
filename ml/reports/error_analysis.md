# Error Analysis Report

Analysis of false positive (Real predicted as Fake) and false negative (Fake predicted as Real) errors evaluated on the cross-dataset benchmark (Kaggle Fake/Real News dataset) for candidates `P2_LR` (`clean_text` + Logistic Regression) and `P1_LR` (raw text + Logistic Regression).

## Observed Error Patterns

1. **Short / Low-Context Texts & Headline-Only Articles**
   - Articles with brief snippets or headline-heavy formatting lack sufficient vocabulary context for TF-IDF feature weighting. When texts are short, missing domain keywords cause the model to default based on prior intercept weights.

2. **Political Opinion Pieces and Editorials**
   - Real opinion articles containing subjective, emotion-heavy, or inflammatory rhetoric (e.g., commentary on political figures) closely resemble the stylized language of fake news articles in the training set.

3. **Satire and Parody**
   - Satirical news pieces use proper news formatting and formal vocabulary while presenting absurd claims. Since standard TF-IDF models analyze word frequencies rather than factual veracity, satire is frequently misclassified as Real news.

4. **Domain and Formatting Shift Across Datasets**
   - The Kaggle dataset contains news from different political eras, blogs, and international sources. Specific venue formatting, capitalization patterns, or source-specific jargon not present in ISOT training data lead to misclassification.

5. **Topic Bias (Over-Reliance on Specific Entities)**
   - Words associated strongly with ISOT news topics (e.g., specific political figures, government bodies) skew prediction towards a specific label regardless of the article's actual truthfulness.
