# Application Architecture

## Overview

```text
React + Vite (:5173)
        │ /api requests
        ▼
Express + MongoDB (:4000) ─── Groq API / GNews / Gmail SMTP
        │ prediction request
        ▼
FastAPI (:8000) ── Predictor ── saved scikit-learn Pipeline
```

The browser talks to Express. Express owns authentication, news, fact-checking, digest email, and prediction persistence. It calls FastAPI for NLP predictions. Training is an offline Python workflow; the FastAPI service loads the saved model when it starts.

## Main Areas

| Path              | Responsibility                                                                     |
| ----------------- | ---------------------------------------------------------------------------------- |
| `frontend/`       | React/Vite user interface; all requests use the Express `/api` proxy.              |
| `backend/node/`   | Express API, authentication, MongoDB models, upstream clients, and scheduled jobs. |
| `backend/python/` | FastAPI health, model information, and prediction endpoints.                       |
| `ml/`             | Importable training, preprocessing, evaluation, and prediction package.            |
| `Documents/`      | Requirements, architecture, learning, decisions, progress, and testing records.    |

## Request Flow

1. React sends `/api/...` requests to the Vite development proxy, which forwards them to Express on port 4000.
2. Express attaches the optional cookie-authenticated user, validates the request, and reads or updates MongoDB as needed.
3. For NLP prediction, Express calls FastAPI at the configured `FASTAPI_URL`; FastAPI calls `Predictor` and returns the model label, score, version, and disclaimer.
4. Fact-check requests require authentication. The service checks MongoDB first, adds cached GNews context when available, and requests a verdict from Groq. Repeated checks use the stored result.
5. The weekly digest job selects recent popular checks and sends email to users whose `emailOptIn` setting is enabled.

## API Boundaries

### Express (`:4000`)

| Route                         | Access        | Purpose                                                            |
| ----------------------------- | ------------- | ------------------------------------------------------------------ |
| `POST /api/auth/register`     | Public        | Create an account and set an httpOnly JWT cookie.                  |
| `POST /api/auth/login`        | Public        | Verify the password and set the cookie.                            |
| `POST /api/auth/logout`       | Public        | Clear the cookie.                                                  |
| `GET /api/auth/me`            | Optional      | Return the current user or `{ "user": null }`.                     |
| `POST /api/auth/email-opt-in` | Authenticated | Update weekly digest preference.                                   |
| `POST /api/predict`           | Guest allowed | Proxy NLP prediction to FastAPI and persist the check.             |
| `POST /api/factcheck`         | Authenticated | Return cached or newly generated fact-check information.           |
| `GET /api/news?topic=`        | Optional      | Return cached news, with topic lookup as implemented by the route. |
| `POST /api/admin/run-digest`  | Authenticated | Manually trigger the digest job.                                   |

Express JSON errors use `{ "error": "message" }`.

### FastAPI (`:8000`)

- `GET /health`: service readiness and model-loaded state.
- `GET /model-info`: saved model-card metadata.
- `POST /predict`: accepts `{ "text": "..." }`; returns `label`, `fake_score`, `model_version`, and a disclaimer.
- Text length is limited to 20–20,000 characters. Validation errors return 422; unavailable model returns 503.
- The score is an uncalibrated model output, not the probability an article is true or false.

## ML and Model Contract

- Labels are defined in `ml/src/config.py`: `FAKE = 1`, `REAL = 0`.
- Training is invoked from the repository root with `.venv/bin/python -m ml.src.train`.
- One sklearn `Pipeline` containing cleaning, TF-IDF, and the classifier is saved to `ml/models/pipeline.joblib`; its metadata is in `ml/models/model_card.json`.
- The pipeline pickles `clean_text` by its module path. Keep the importable package `ml.src.preprocess` at the repository root and do not move `ml/` without retraining and verifying the artifact.
- FastAPI loads the artifact once at startup through `Predictor.load()`.

## MongoDB Data

- `User`: normalized email, bcrypt password hash, digest opt-in, and creation time.
- `Check`: stable article hash, short text preview, NLP result, optional fact-check, repeat count, and last-check time.
- `NewsItem`: normalized GNews article details, topic, and cache timestamps.

Passwords are stored as hashes. JWTs are carried in httpOnly cookies. Never log article text or put credentials into tracked files.

## External Services and Failure Handling

- MongoDB stores users, checks, and cached news.
- GNews supplies feed articles and context; cached records reduce repeated upstream calls.
- Groq supplies fact-check reasoning; cached results avoid repeat requests. Upstream failures use the route's graceful unavailable response.
- Nodemailer uses Gmail SMTP for the optional weekly digest. A missing SMTP configuration skips sending rather than preventing the app from starting.

## Configuration and Local Startup

The Express service reads settings from the ignored root `.env`; `.env.example` lists the variable names and safe placeholders. FastAPI does not need the Node API credentials. Keep `.env`, datasets, generated model artifacts, and dependency directories out of version control.

From the repository root:

```bash
cp .env.example .env
npm --prefix backend/node install
npm --prefix frontend install
bash scripts/dev.sh
```

The script starts FastAPI on 8000, Express on 4000, and Vite on 5173. The Python virtual environment and local service credentials must be configured first. The Express API can also be started with `npm --prefix backend/node run dev`.
