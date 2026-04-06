# MIMII Anomaly Detection System — System Design Document

**Author:** Kavin Sagar  
**Institution:** HAN University of Applied Sciences  
**Date:** April 2026  
**Stack:** Python 3.11 · PyTorch · FastAPI · SQL Server · Supabase · React

---

## 1. Problem Statement

Industrial machines fail gradually before they fail completely. A fan running with
a damaged blade, a pump with a clogged filter, or a valve with contamination all
produce acoustic signatures that deviate from normal operation weeks before
catastrophic failure occurs.

The goal of this system is to detect these deviations automatically using audio
recorded from real factory machines — enabling predictive maintenance rather than
reactive repair.

**Why this is hard:**

- Anomalies are rare in production (~5-10% of recordings)
- You cannot enumerate all possible fault types in advance
- Factory floors are noisy environments that mask fault signals
- Models trained on clean lab data degrade in real conditions

---

## 2. Architecture Overview

Raw Audio (.wav)
│
▼
┌─────────────────┐
│ Feature │ librosa — MFCC, spectral centroid,
│ Extraction │ bandwidth, RMS, zero-crossing rate
│ (37ms avg) │ → 34-dimensional feature vector
└────────┬────────┘
│
▼
┌─────────────────┐
│ ML Models │ Isolation Forest (baseline)
│ (0.55ms avg) │ PyTorch Autoencoder (primary)
│ │ → anomaly score 0.0–1.0
└────────┬────────┘
│
▼
┌─────────────────┐ ┌──────────────────┐
│ SQL Server │────▶│ Supabase │
│ (local) │ │ (cloud sync) │
│ predictions, │ │ read-only public │
│ features, │ │ access │
│ audio_clips │ └──────────────────┘
└────────┬────────┘
│
▼
┌─────────────────┐
│ FastAPI │ REST API — 7 endpoints
│ Backend │ real-time WAV upload + scoring
│ │ latency tracking per stage
└────────┬────────┘
│
▼
┌─────────────────┐
│ React Frontend │ Dashboard · Analytics · Live Demo
│ │ Recharts visualisations
│ │ Oscilloscope-inspired UI
└─────────────────┘

---

## 3. Model Selection — Trade-offs

### Why two models?

Running both Isolation Forest and an Autoencoder was a deliberate architectural
decision, not redundancy.

| Dimension         | Isolation Forest      | Autoencoder                |
| ----------------- | --------------------- | -------------------------- |
| Training paradigm | Unsupervised          | Semi-supervised            |
| Inference speed   | ~0.1ms                | ~0.55ms                    |
| 6dB AUC-ROC       | 0.8549                | 0.9216                     |
| 0dB AUC-ROC       | 0.6964                | 0.8110                     |
| -6dB AUC-ROC      | 0.5896                | 0.6845                     |
| Explainability    | High (isolation path) | Low (reconstruction error) |
| Retraining cost   | Low                   | Medium                     |
| Production role   | Fast pre-filter       | Primary scorer             |

**Key insight:** The performance gap between models _widens_ as noise increases.
At -6dB, Isolation Forest is near-random (0.59) while the Autoencoder retains
meaningful signal (0.68). This confirms the Autoencoder learns genuine acoustic
structure rather than superficial statistical patterns.

### Why not a supervised classifier?

A supervised approach (e.g. XGBoost with normal/abnormal labels) was deliberately
avoided for three reasons:

1. **Class imbalance** — ~10% abnormal samples leads to degenerate classifiers
   that achieve high accuracy by predicting "normal" for everything
2. **Closed-world assumption** — a classifier trained on known fault types will
   not detect novel faults it has never seen
3. **Real-world data availability** — in production, abnormal labels are expensive
   to obtain; normal operation data is abundant

Semi-supervised anomaly detection mirrors real deployment conditions.

---

## 4. Feature Engineering Decisions

Each 10-second audio clip at 16kHz produces 160,000 raw samples. The feature
extraction pipeline compresses this to a 34-dimensional vector:

| Feature                     | Dimensions | Captures                       |
| --------------------------- | ---------- | ------------------------------ |
| MFCC mean (13 coefficients) | 13         | Average spectral shape         |
| MFCC std (13 coefficients)  | 13         | Spectral variability over time |
| Spectral centroid mean/std  | 2          | Centre of frequency mass       |
| Spectral bandwidth mean/std | 2          | Spread of active frequencies   |
| RMS energy mean/std         | 2          | Overall loudness profile       |
| Zero crossing rate mean/std | 2          | Signal roughness / noisiness   |
| **Total**                   | **34**     |                                |

**Why not raw spectrograms?**
Feeding raw mel spectrograms (128×128 pixels = 16,384 features) into the model
would require a convolutional autoencoder and significantly more training data.
The 34-feature vector is deliberately chosen for interpretability, speed, and
robustness — a production trade-off over raw accuracy.

**Bottleneck identified:** Feature extraction takes 37ms on average vs 0.55ms
for model inference. The current bottleneck is librosa's MFCC computation, not
the neural network. This is the first optimisation target for production.

---

## 5. Noise Level Analysis — Real-World Deployment Implications

The system was evaluated across three signal-to-noise ratios matching real factory
conditions:

| SNR  | Condition | IF AUC | AE AUC | vs F1 Baseline |
| ---- | --------- | ------ | ------ | -------------- |
| +6dB | Clean     | 0.8549 | 0.9216 | +9.1pp ✅      |
| 0dB  | Moderate  | 0.6964 | 0.8110 | −2.0pp ⚠️      |
| -6dB | Noisy     | 0.5896 | 0.6845 | −14.7pp ❌     |

**Interpretation:** The system is production-ready at 6dB and borderline useful
at 0dB. At -6dB, performance degrades to a level that would generate too many
false positives for practical deployment.

**Recommended mitigations for -6dB environments:**

- Bandpass filtering to isolate machine frequency range before feature extraction
- Ensemble the Autoencoder with a denoising pre-processing step
- Deploy closer microphones to increase effective SNR
- Collect more training data at -6dB to fine-tune the model

---

## 6. Database Architecture — Why Two Databases?

| Layer | Technology            | Role                                                 |
| ----- | --------------------- | ---------------------------------------------------- |
| Local | SQL Server Express    | Development, training metadata, fast iteration       |
| Cloud | Supabase (PostgreSQL) | Read-only public access, frontend production queries |

**Trade-off:** SQL Server was chosen over PostgreSQL locally because it integrates
with existing HAN university tooling (SSMS) and matches common Dutch industrial
software stacks. Supabase provides a managed PostgreSQL instance with a REST API
and row-level security for safe public exposure.

**Sync strategy:** Predictions are batch-synced to Supabase after each training
run rather than written in real-time. This decouples the training pipeline from
network availability.

---

## 7. API Design Decisions

The FastAPI backend exposes 7 endpoints across 3 routers:
GET /machines/ — machine registry
GET /machines/{id} — single machine detail
GET /predictions/ — paginated prediction history
POST /predictions/predict — real-time WAV scoring
GET /analytics/summary — dashboard hero metrics
GET /analytics/model-comparison — model performance by noise level
GET /analytics/score-distribution — histogram data for visualisation
GET /analytics/noise-comparison — cross-noise-level comparison

**Key design decisions:**

- All endpoints return JSON — no server-side rendering
- Models are loaded once at startup, not per-request (eliminates ~2s cold start)
- File uploads use multipart/form-data with temp file cleanup
- CORS is explicitly configured for localhost development ports

---

## 8. Observed Latency Profile

Measured on local hardware (Windows 11, Intel CPU, no GPU):

| Stage              | Latency | Notes                          |
| ------------------ | ------- | ------------------------------ |
| Feature extraction | ~37ms   | librosa MFCC — main bottleneck |
| Model inference    | ~0.55ms | PyTorch CPU forward pass       |
| Total API response | ~38ms   | Well within 100ms UX threshold |

**Production optimisation path:**

1. Pre-compute features offline for batch evaluation
2. Replace librosa with a compiled C++ feature extractor for real-time use
3. GPU inference would reduce model latency to <0.1ms (negligible given bottleneck)
4. Async feature extraction with a job queue for high-throughput scenarios

---

## 9. Failure Modes and Mitigations

| Failure Mode                                            | Probability  | Impact | Mitigation                                                               |
| ------------------------------------------------------- | ------------ | ------ | ------------------------------------------------------------------------ |
| Model drift — machine wears over time, "normal" changes | High         | High   | Periodic retraining on rolling window of recent normal data              |
| Novel fault type not seen in training                   | Medium       | High   | Ensemble with rule-based frequency analysis as safety net                |
| Microphone failure — silent or clipped audio            | Medium       | High   | RMS energy threshold check before inference                              |
| High false positive rate in noisy environments          | High at -6dB | Medium | Confidence thresholding — only alert above 0.7 score                     |
| SQL Server unavailable                                  | Low          | Low    | Graceful degradation — API continues serving predictions without logging |
| Large audio file upload                                 | Low          | Low    | File size validation at API gateway                                      |

---

## 10. Scaling Strategy

The current system is designed for single-machine, single-site deployment.
A production scaling path would involve:

**Horizontal scaling:**

- Replace SQL Server with PostgreSQL (cloud-native, horizontally scalable)
- Containerise the FastAPI service with Docker
- Deploy behind a load balancer for multiple concurrent prediction requests

**Multi-machine support:**

- The database schema already supports multiple machine types and IDs
- Each machine type requires its own trained model (models are not transferable
  across machine types due to different acoustic signatures)
- A model registry (e.g. MLflow) would manage versioned models per machine

**Streaming audio:**

- Current system processes complete 10-second clips
- Production upgrade: sliding window inference on continuous audio streams
- Would require a message queue (Kafka/Redis) between audio capture and inference

---

## 11. What I Would Do Differently

Honest reflection on limitations and next steps:

1. **Convolutional Autoencoder on raw spectrograms** — would likely push -6dB
   AUC from 0.68 to 0.80+ at the cost of training complexity
2. **Data augmentation** — adding synthetic noise to 6dB data during training
   would improve generalisation to noisier conditions
3. **Threshold optimisation** — the current 0.1 anomaly score threshold was set
   manually; a precision-recall curve analysis would find the optimal operating point
4. **A/B testing framework** — compare Isolation Forest vs Autoencoder on live
   traffic rather than the same held-out dataset
5. **Monitoring dashboard** — track model performance over time as new predictions
   accumulate, alerting when AUC degrades below a threshold

---

_Built in 7 days as Project 2 of an ML portfolio series._  
_Project 1: F1 Race Prediction System (AUC 0.831)_  
_Project 2: MIMII Industrial Anomaly Detection (AUC 0.922 @ 6dB)_
