# Exploratory Data Analysis (EDA) Summary

## 1. Datasets Source & License
- **Primary Dataset (ISOT Fake News Dataset)**:
  - Source: University of Victoria / Kaggle Mirror (`Fake.csv`, `True.csv`).
  - License / Usage: Open for academic and research evaluation.
- **Secondary Evaluation Dataset (Kaggle Fake or Real News)**:
  - Source: Kaggle (`jillanisofttech/fake-or-real-news` / `fake_or_real_news.csv`).
  - License / Usage: Open dataset for educational classification tasks.

## 2. Row Counts Before and After Cleaning

| Dataset | Raw Rows | Clean Rows | Duplicates / Dropped | Final FAKE (1) | Final REAL (0) |
|---|---|---|---|---|---|
| **ISOT Dataset** | 44,898 (`Fake`: 23,481, `True`: 21,417) | 39,100 | 5,798 | 17,905 (45.79%) | 21,195 (54.21%) |
| **Kaggle Fake or Real** | 6,335 (`FAKE`: 3,164, `REAL`: 3,171) | 6,305 | 30 | 3,151 (49.98%) | 3,154 (50.02%) |

## 3. Label Verification Notes
- **ISOT**:
  - `Fake.csv` mapped to `FAKE = 1`.
  - `True.csv` mapped to `REAL = 0`.
- **Kaggle Fake or Real News**:
  - String label `'FAKE'` mapped to `config.FAKE = 1`.
  - String label `'REAL'` mapped to `config.REAL = 0`.
  - Verified against 10 sample articles per class: sensational headlines and non-standard sources confirmed as FAKE, mainstream traditional reporting (CNN, Reuters, AP) confirmed as REAL.

## 4. Artifact & Data Leakage Observations in ISOT
Analysis of raw text revealed severe publisher-specific structural signatures in ISOT:
- **` (Reuters)` publisher tag**: Present in **99.21%** (21,247 / 21,417) of `REAL` articles, but only **0.04%** (9 / 23,481) of `FAKE` articles.
- **Subject Categories**: Zero overlap between classes.
  - `REAL` subjects: `politicsNews` (11,272), `worldnews` (10,145).
  - `FAKE` subjects: `News` (9,050), `politics` (6,841), `left-news` (4,459), `Government News` (1,570), `US_News` (783), `Middle-east` (778).
  - **Conclusion**: `subject` and `date` must never be used as predictive features.
- **Other Source/Formatting Artifacts**:
  - `"via"`: FAKE = **49.34%**, REAL = **5.24%**
  - `"featured image"`: FAKE = **34.76%**, REAL = **0.00%**
  - `"21st Century Wire"`: FAKE = **5.34%**, REAL = **0.00%**
  - `"twitter.com"`: FAKE = **15.38%**, REAL = **0.00%**
  - `"http"`: FAKE = **14.06%**, REAL = **0.00%**

*Figures generated: `ml/reports/figures/class_balance.png` and `ml/reports/figures/length_histograms.png`.*
