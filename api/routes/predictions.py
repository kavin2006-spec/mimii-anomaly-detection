from fastapi import APIRouter, UploadFile, File, HTTPException, Query
from sqlalchemy import text
from src.database.connection import get_engine
from src.audio.features import extract_features
import torch
import joblib
import numpy as np
import tempfile
import os

router = APIRouter()
engine = get_engine()

def load_model(machine_type: str, noise_level: str):
    from src.models.autoencoder import FanAutoencoder
    nl = noise_level.replace('-', 'min')
    
    if machine_type == "fan":
        if noise_level == "6dB":
            model_path  = "models_saved/autoencoder.pt"
            scaler_path = "models_saved/scaler_autoencoder.joblib"
        else:
            model_path  = f"models_saved/autoencoder_{nl}.pt"
            scaler_path = f"models_saved/scaler_{nl}.joblib"
    else:
        model_path  = f"models_saved/autoencoder_{machine_type}_{nl}.pt"
        scaler_path = f"models_saved/scaler_{machine_type}_{nl}.joblib"

    ae = FanAutoencoder(input_dim=34)
    ae.load_state_dict(torch.load(model_path, map_location="cpu"))
    ae.eval()
    scaler = joblib.load(scaler_path)
    return ae, scaler

# Thresholds per machine/noise — 90th percentile of normal training errors
# These are calibrated values from our training experiments
THRESHOLDS = {
    ("fan",  "6dB"):  0.8549,
    ("fan",  "0dB"):  0.9250,
    ("fan",  "-6dB"): 0.9167,
    ("pump", "6dB"):  0.5981,
    ("pump", "0dB"):  0.6271,
    ("pump", "-6dB"): 0.6430,
}

@router.get("/")
def get_predictions(model_name: str = None, limit: int = 100):
    query = """
        SELECT TOP (:limit)
            p.id, ac.filename, ac.label, p.model_name,
            p.anomaly_score, p.predicted_label, p.true_label
        FROM predictions p
        JOIN audio_clips ac ON p.clip_fk = ac.id
        WHERE (:model_name IS NULL OR p.model_name = :model_name)
        ORDER BY p.id DESC
    """
    with engine.connect() as conn:
        rows = conn.execute(text(query), {
            "limit":      limit,
            "model_name": model_name
        }).fetchall()

    return [{
        "id":              row[0],
        "filename":        row[1],
        "true_label":      row[2],
        "model_name":      row[3],
        "anomaly_score":   row[4],
        "predicted_label": row[5],
    } for row in rows]

@router.post("/predict")
async def predict(
    file:         UploadFile = File(...),
    machine_type: str = Query(default="fan"),
    noise_level:  str = Query(default="6dB")
):
    import time

    if not file.filename.endswith(".wav"):
        raise HTTPException(status_code=400, detail="Only .wav files accepted")

    with tempfile.NamedTemporaryFile(delete=False, suffix=".wav") as tmp:
        content = await file.read()
        tmp.write(content)
        tmp_path = tmp.name

    try:
        ae_model, ae_scaler = load_model(machine_type, noise_level)

        t_start = time.perf_counter()

        t0       = time.perf_counter()
        features = extract_features(tmp_path)
        t_feature = (time.perf_counter() - t0) * 1000

        t0              = time.perf_counter()
        features_scaled = ae_scaler.transform(features.reshape(1, -1))
        tensor          = torch.FloatTensor(features_scaled)
        error           = ae_model.reconstruction_error(tensor).item()
        t_inference     = (time.perf_counter() - t0) * 1000

        t_total = (time.perf_counter() - t_start) * 1000

        # Use calibrated threshold per machine/noise level
        threshold       = THRESHOLDS.get((machine_type, noise_level), 0.15)
        anomaly_score   = min(error / (threshold * 2), 1.0)
        predicted_label = "abnormal" if error > threshold else "normal"

        return {
            "filename":             file.filename,
            "machine_type":         machine_type,
            "noise_level":          noise_level,
            "model_name":           "autoencoder",
            "anomaly_score":        round(anomaly_score, 4),
            "predicted_label":      predicted_label,
            "reconstruction_error": round(error, 4),
            "threshold_used":       threshold,
            "latency_ms": {
                "feature_extraction": round(t_feature, 2),
                "model_inference":    round(t_inference, 2),
                "total":              round(t_total, 2)
            }
        }
    finally:
        os.unlink(tmp_path)