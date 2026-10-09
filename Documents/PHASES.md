# Project Phases

This file summarizes the full development sequence. All phases are complete; see [PROGRESS.md](PROGRESS.md) for outcomes and verification history.

## Phase 0: Setup and Skeleton

Establish the repository, Python package layout, virtual environment, dependencies, and shared configuration for reliable imports and reproducible runs.

## Phase 1: Data

Inspect, clean, deduplicate, and document the ISOT and second news datasets; produce processed data, EDA figures, and verified label notes.

## Phase 2: Baseline Model

Build the first TF-IDF and Logistic Regression pipeline, compare it with a majority-class baseline, and save metrics and a confusion matrix.

## Phase 3: Leakage and Generalization

Inspect learned features for publisher and formatting artifacts, add deterministic text cleaning, and use a separate dataset to measure domain shift.

## Phase 4: Experiments

Compare preprocessing and classifiers using training-only cross-validation, held-out and cross-dataset evaluation, and error analysis; justify the selected model.

## Phase 5: Final Model and Prediction Module

Package the chosen pipeline, train and save its model card, and provide a tested Predictor that keeps the artifact and preprocessing together.

## Phase 6: Python Backend API

Serve the Predictor through FastAPI with request validation, health/model-info endpoints, startup loading, and API tests; keep the importable ML package at the repository root.

## Phase 7: Frontend

Build the React/Vite interface for article submission, loading/error states, model results, and limitations.

## Phase 8: Integration and Hardening

Verify clean-room setup, frontend/API consistency, privacy-safe logging, input boundaries, dependency pins, and reproducible startup.

## Phase 9: Documentation and Viva Preparation

Prepare project documentation, empirical results, figures, demo, and presentation material; keep claims and metrics traceable to real reports and runs.

## Phase 10: Node/Express and MongoDB

Add Express and MongoDB, proxy predictions to FastAPI, and persist repeated article checks in `backend/node/`.

## Phase 11: Authentication

Implement registration, login, logout, JWT cookies, password hashing, and optional user attachment while retaining guest predictions.

## Phase 12: News Feed

Fetch and cache GNews items, refresh in the background, support topic queries, and show the feed in React.

## Phase 13: Fact-Check

Provide a protected Groq-backed fact-check using cached checks and related news context; handle malformed output and upstream failures safely.

## Phase 14: Frontend Integration

Connect React to Express, persist cookie-backed auth state, retain guest predictions, and require login for fact-checking.

## Phase 15: Weekly Email Digest

Schedule a digest of popular recent checks, provide an authenticated manual trigger, send through SMTP, and respect user opt-in.
