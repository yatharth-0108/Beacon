# Report Notes

Draft material for the written report. Every project metric below points to a file under `ml/reports/`; verify the cited source before transferring a number into the final report.

## 1. Introduction

- The project studies a binary text-classification task: classify an article as `FAKE` or `REAL` from its writing patterns.
- The application is not a fact-checker. Its model has no claim-verification, source-checking, or evidence-retrieval component.
- The main experimental question is how a compact TF-IDF and Logistic Regression pipeline performs in-domain and on a second dataset.

## 2. Literature

These notes are based on sources reviewed for Phase 9. The Wang and Rashkin notes use their published abstracts and bibliographic pages; the Shu et al. HTML paper was reviewed for its task, feature, evaluation, and dataset sections. Read the full papers before making claims beyond these summaries.

- William Yang Wang (2017), “'Liar, Liar Pants on Fire': A New Benchmark Dataset for Fake News Detection,” ACL 2017. The paper introduces LIAR, a set of manually labeled short statements collected from PolitiFact, and studies text-only as well as metadata-assisted approaches. Its short claims and fine-grained labels are not directly interchangeable with this project's binary full-article datasets. [ACL Anthology](https://aclanthology.org/P17-2067/). DOI: `10.18653/v1/P17-2067`.
- Kai Shu, Amy Sliva, Suhang Wang, Jiliang Tang, and Huan Liu (2017), “Fake News Detection on Social Media: A Data Mining Perspective,” ACM SIGKDD Explorations / arXiv:1708.01967. The survey separates article-content cues from social-context signals and reviews dataset and evaluation limitations. This project uses article text only, so it does not use the social engagement signals discussed in the survey. [arXiv HTML](https://arxiv.org/html/1708.01967v3). DOI: `10.48550/arXiv.1708.01967`.
- Hannah Rashkin, Eunsol Choi, Jin Yea Jang, Svitlana Volkova, and Yejin Choi (2017), “Truth of Varying Shades: Analyzing Language in Fake News and Political Fact-Checking,” EMNLP 2017. The study compares language across real news, satire, hoaxes, and propaganda; it reports that stylistic cues can help while automated truth assessment remains open. This supports treating a text-style prediction as limited evidence, not fact verification. [ACL Anthology](https://aclanthology.org/D17-1317/). DOI: `10.18653/v1/D17-1317`.

## 3. Methodology

- Data: ISOT has 39,100 cleaned rows, with 17,905 FAKE and 21,195 REAL. The second dataset has 6,305 cleaned rows, with 3,151 FAKE and 3,154 REAL. Source: `ml/reports/eda_summary.md`.
- The EDA found strong publisher artifacts in ISOT: `(Reuters)` occurs in 99.21% of REAL articles and 0.04% of FAKE articles; subject categories do not overlap. Source: `ml/reports/eda_summary.md`.
- Cleaning targets publisher and formatting artifacts before unigram TF-IDF. Source: `ml/reports/leakage_report.md`.
- The final model is P2_LR: `clean_text`, unigram TF-IDF with `max_features=50,000`, and Logistic Regression. The model card records a 31,280/7,820 train/test split and `random_state=42`. Sources: `ml/models/model_card.json`, `ml/reports/model_selection.md`.
- Evaluation compares five-fold stratified CV, an ISOT held-out test split, and cross-dataset evaluation. The full 12-combination table is in `ml/reports/experiments.csv`.

## 4. Implementation

- Offline training creates one scikit-learn `Pipeline`; the API loads that saved artifact through `Predictor`.
- Express is the browser-facing API for authentication, news, fact-checking, and predictions. It proxies NLP requests to FastAPI, which provides `/health`, `/model-info`, and `/predict`; React displays the model label, score, and disclaimer.
- The implementation follows the request/response contract in `Documents/ARCHITECTURE.md`. See that file for the exact JSON schemas and status codes.

## 5. Results

Final P2_LR model-card metrics:

| Evaluation         |     Accuracy | Precision (FAKE) | Recall (FAKE) | F1 (FAKE) |
| ------------------ | -----------: | ---------------: | ------------: | --------: |
| ISOT held-out test |       97.84% |           98.44% |        96.82% |    97.62% |
| Second dataset     | not reported |     not reported |  not reported |    69.13% |

Source: `ml/reports/experiments.csv`, `ml/reports/model_selection.md`, and `ml/reports/leakage_report.md`. Cross-dataset accuracy, precision, and recall are not reported under `ml/reports/`; do not copy them into the report unless you add a verified report source. Do not describe the in-domain score alone as evidence of real-world accuracy.

- P1_LR has cross-dataset F1 69.63%, while P2_LR has 69.13%; P1_LR retains raw publisher artifacts, which is why the cleaned P2_LR was selected. Source: `ml/reports/experiments.csv`, `ml/reports/model_selection.md`.
- The baseline-to-cleaned cross-dataset results are 69.63% to 69.13% F1, while the ISOT test F1 changes from 98.07% to 97.62%. Source: `ml/reports/cross_dataset.json` and `ml/reports/leakage_report.md`.

## 6. Limitations

- Dataset labels, collection choices, publisher signatures, and time period constrain what the model learns. The EDA and leakage report document the ISOT publisher artifacts: `ml/reports/eda_summary.md`, `ml/reports/leakage_report.md`.
- Performance is lower on the second dataset; domain and publisher shift are documented in `ml/reports/cross_dataset.json` and `ml/reports/error_analysis.md`.
- Error analysis describes failures on short or low-context text, opinion/editorial language, satire, formatting/domain shifts, and topic-specific entities. Source: `ml/reports/error_analysis.md`.
- The displayed score is uncalibrated and not the probability that a story is true. The app is not suitable for moderation, publication decisions, or fact-checking without human review.

## 7. Conclusion

- The project demonstrates a reproducible baseline and a cleaned text pipeline, an API/UI integration, and an out-of-domain evaluation.
- The key result is the gap between the ISOT test score and the second-dataset score. The practical conclusion is to report both, describe the known leakage and domain limitations, and avoid treating the prediction as a truth verdict.
