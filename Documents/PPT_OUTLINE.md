# Presentation Outline (12 Slides)

1. **Title** — Fake News Detection Using NLP; project scope and author.
2. **Problem and Scope** — Binary article-text classification; explicit non-goal: not a fact-checker.
3. **Datasets** — ISOT and Kaggle Fake or Real News sources, licenses, cleaned row counts, and class balance. Source: `ml/reports/eda_summary.md`.
4. **EDA and Leakage** — `(Reuters)` and subject/date signatures; why source artifacts threaten evaluation. Source: `ml/reports/eda_summary.md`, `ml/reports/leakage_report.md`.
5. **NLP Pipeline** — `clean_text` → unigram TF-IDF → Logistic Regression; one saved sklearn Pipeline.
6. **Experiments** — The 12 preparation/classifier combinations and evaluation setup. Source: `ml/reports/experiments.csv`.
7. **Model Selection** — P2_LR selection: cleaned text, native `predict_proba`, competitive cross-dataset performance; explain why the raw P1_LR cross score was not selected. Source: `ml/reports/model_selection.md`.
8. **Results** — ISOT test and second-dataset metrics side by side; show `Documents/figures/model_comparison.png`.
9. **System Architecture** — React/Vite → Express → FastAPI → Predictor → saved sklearn Pipeline; show the prediction API and the Express auth/news/fact-check routes.
10. **Live Demo** — Analyze one sample, inspect result/disclaimer, show `/docs`, then show the top-feature figures.
11. **Limitations and Future Work** — Domain shift, source/topic bias, short text, non-calibrated score; propose (not claim) future evaluation.
12. **Conclusion** — Summarize what the model demonstrates, its out-of-domain limit, and why human fact-checking remains necessary.
