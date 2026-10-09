# Test Execution Matrix & Hardening Verification

**Date:** 2026-09-28
**Tester:** AI Pair / Automated Integration Hardening Suite

## Manual & Integration Test Cases

### 2026-09-28 clean-room continuation

The backend-unavailable observation below predates the Express API integration and reflects the original direct FastAPI proxy. In the current layout, the browser-facing Express API runs on port 4000.

| Case                         | Result                                                                                                                                                                       |
| ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Clean-room setup from README | PASS: venv dependencies installed, approved local CSV copies placed at the README paths, frontend dependencies installed and built, model trained, and both servers started. |
| Missing model artifact       | PASS (verified earlier on 2026-09-28): `/health` returned `model_loaded: false`, `/predict` returned HTTP 503, and the UI displayed “Model not available. Train it first.”   |

| Case ID | Scenario / Input                                                                             | Expected Result                                                                                                                | Actual Result                                                                                                                                            | Pass/Fail |
| ------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- | --------- |
| TC-01   | Normal article paste (e.g. 500 words Fed Reserve article)                                    | Result card rendered with classification label, percentage score bar, and disclaimer.                                          | Sample article (418 chars) rendered a REAL result, 20% fake-likelihood score, and disclaimer.                                                            | PASS      |
| TC-02   | Headline only (short text, e.g. 35 chars: "Federal Reserve maintains interest rates today.") | Result returned, with UI note/hint indicating short text is less reliable.                                                     | Result displayed with warning badge: "Short text (<100 words): predictions on headline-length text are less reliable."                                   | PASS      |
| TC-03   | Text length < 20 chars (e.g. "Breaking news now")                                            | Analyse button disabled; character counter turns red showing minimum requirements. API returns 422 validation error if forced. | A 14-character input showed “Need at least 20 characters”; Analyse was disabled.                                                                         | PASS      |
| TC-04   | Text length > 20,000 chars                                                                   | Input capped/blocked by textarea max length and submit disabled with red counter. API returns 422 validation error if forced.  | With 20,001 characters entered, the counter showed 20,001 / 20,000 in red, the max-length hint appeared, Analyse was disabled, and the API returned 422. | PASS      |
| TC-05   | Non-English text (e.g. French / Spanish article)                                             | Works without crashing; prediction returned based on word patterns. Limitations noted in About tab.                            | Article processed without errors (score returned: REAL 8%). Limitations documented in About component.                                                   | PASS      |
| TC-06   | Special characters (HTML `<script>`, emojis 🚀, newlines, quotes `""`)                       | Sanitization / TF-IDF processing works cleanly without crashing or XSS script execution.                                       | Processed without errors; clean text vectorizer strips HTML/emojis gracefully. Result returned safely.                                                   | PASS      |
| TC-07   | Backend service stopped / unreachable                                                        | User-friendly error message rendered in UI banner instead of raw app crash.                                                    | Historical Phase 8 check: with Vite running and FastAPI stopped, the UI showed the then-current backend-unavailable hint.                                | PASS      |
| TC-08   | Model file missing (`ml/models/pipeline.joblib` deleted/missing)                             | `/health` returns `model_loaded: false`, `/predict` returns HTTP 503, UI displays clear model unavailable message.             | `/health` returns `model_loaded: false`. `/predict` returns 503 Service Unavailable with detail message.                                                 | PASS      |

## Automated Test Coverage

- **Unit & Integration Suite (`python -m pytest`):** 17 tests passed (100%).
- **Consistency Test (`tests/test_consistency.py`):** Verified 5 sample texts produce identical labels and `fake_score` values when queried directly via Python class (`Predictor.predict`) vs HTTP API (`TestClient.post("/predict")`).
- **Privacy Audit:** HTTP logger middleware verified in `backend/python/main.py`. Logs only path, method, HTTP status code, and latency in ms — no article body is logged.
