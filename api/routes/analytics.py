from fastapi import APIRouter
from sqlalchemy import text
from src.database.connection import get_engine

router = APIRouter()
engine = get_engine()

@router.get("/model-comparison")
def model_comparison(noise_level: str = "6dB", machine_type: str = "fan",
                     machine_id: str = "id_00"):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT p.model_name, COUNT(*) as total,
                SUM(CASE WHEN p.predicted_label = p.true_label THEN 1 ELSE 0 END) as correct
            FROM predictions p
            JOIN audio_clips ac ON p.clip_fk = ac.id
            JOIN machines m ON ac.machine_fk = m.id
            WHERE m.noise_level = :nl AND m.machine_type = :mt
            AND m.machine_id = :mid
            GROUP BY p.model_name
        """), {"nl": noise_level, "mt": machine_type, "mid": machine_id}).fetchall()

    auc_map = {
        ("fan",  "6dB",  "isolation_forest"): 0.8549,
        ("fan",  "6dB",  "autoencoder"):      0.9216,
        ("fan",  "0dB",  "isolation_forest"): 0.6964,
        ("fan",  "0dB",  "autoencoder"):      0.8110,
        ("fan",  "-6dB", "isolation_forest"): 0.5896,
        ("fan",  "-6dB", "autoencoder"):      0.6845,
        ("pump", "6dB",  "isolation_forest"): 0.9742,
        ("pump", "6dB",  "autoencoder"):      0.9982,
        ("pump", "0dB",  "isolation_forest"): 0.9282,
        ("pump", "0dB",  "autoencoder"):      0.9755,
        ("pump", "-6dB", "isolation_forest"): 0.8865,
        ("pump", "-6dB", "autoencoder"):      0.9233,
    }

    return [{
        "model_name": row[0],
        "auc_roc":    auc_map.get((machine_type, noise_level, row[0]), 0),
        "total":      row[1],
        "correct":    row[2],
        "accuracy":   round(row[2] / row[1], 4) if row[1] > 0 else 0
    } for row in rows]

@router.get("/score-distribution")
def score_distribution(model_name: str = "autoencoder",
                        noise_level: str = "6dB",
                        machine_type: str = "fan",
                        machine_id: str = "id_00"):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT p.anomaly_score, p.true_label
            FROM predictions p
            JOIN audio_clips ac ON p.clip_fk = ac.id
            JOIN machines m ON ac.machine_fk = m.id
            WHERE p.model_name = :model_name
            AND m.noise_level = :noise_level
            AND m.machine_type = :machine_type
            AND m.machine_id = :machine_id
        """), {
            "model_name":   model_name,
            "noise_level":  noise_level,
            "machine_type": machine_type,
            "machine_id":   machine_id
        }).fetchall()

    return [{"anomaly_score": row[0], "true_label": row[1]} for row in rows]

@router.get("/summary")
def summary(machine_type: str = "fan", machine_id: str = "id_00",
            noise_level: str = "6dB"):
    with engine.connect() as conn:
        total_clips = conn.execute(text("""
            SELECT COUNT(*) FROM audio_clips ac
            JOIN machines m ON ac.machine_fk = m.id
            WHERE m.machine_type = :mt AND m.machine_id = :mid
            AND m.noise_level = :nl
        """), {"mt": machine_type, "mid": machine_id, "nl": noise_level}).scalar()

        normal_clips = conn.execute(text("""
            SELECT COUNT(*) FROM audio_clips ac
            JOIN machines m ON ac.machine_fk = m.id
            WHERE m.machine_type = :mt AND m.machine_id = :mid
            AND m.noise_level = :nl AND ac.label = 'normal'
        """), {"mt": machine_type, "mid": machine_id, "nl": noise_level}).scalar()

        abnormal_clips = conn.execute(text("""
            SELECT COUNT(*) FROM audio_clips ac
            JOIN machines m ON ac.machine_fk = m.id
            WHERE m.machine_type = :mt AND m.machine_id = :mid
            AND m.noise_level = :nl AND ac.label = 'abnormal'
        """), {"mt": machine_type, "mid": machine_id, "nl": noise_level}).scalar()

    auc_map = {
        ("fan",  "6dB"):  0.9216, ("fan",  "0dB"):  0.8110, ("fan",  "-6dB"): 0.6845,
        ("pump", "6dB"):  0.9982, ("pump", "0dB"):  0.9755, ("pump", "-6dB"): 0.9233,
    }

    return {
        "total_clips":    total_clips,
        "normal_clips":   normal_clips,
        "abnormal_clips": abnormal_clips,
        "best_model":     "autoencoder",
        "best_auc_roc":   auc_map.get((machine_type, noise_level), 0),
        "machine_type":   machine_type,
        "noise_level":    noise_level
    }

@router.get("/noise-comparison")
def noise_comparison(machine_type: str = "fan", machine_id: str = "id_00"):
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT
                m.noise_level,
                p.model_name,
                COUNT(*) as total,
                SUM(CASE WHEN p.predicted_label = p.true_label THEN 1 ELSE 0 END) as correct
            FROM predictions p
            JOIN audio_clips ac ON p.clip_fk = ac.id
            JOIN machines m ON ac.machine_fk = m.id
            WHERE m.machine_type = :machine_type
            AND m.machine_id = :machine_id
            GROUP BY m.noise_level, p.model_name
        """), {"machine_type": machine_type, "machine_id": machine_id}).fetchall()

    auc_map = {
        ("fan",  "6dB",  "isolation_forest"): 0.8549,
        ("fan",  "6dB",  "autoencoder"):      0.9216,
        ("fan",  "0dB",  "isolation_forest"): 0.6964,
        ("fan",  "0dB",  "autoencoder"):      0.8110,
        ("fan",  "-6dB", "isolation_forest"): 0.5896,
        ("fan",  "-6dB", "autoencoder"):      0.6845,
        ("pump", "6dB",  "isolation_forest"): 0.9742,
        ("pump", "6dB",  "autoencoder"):      0.9982,
        ("pump", "0dB",  "isolation_forest"): 0.9282,
        ("pump", "0dB",  "autoencoder"):      0.9755,
        ("pump", "-6dB", "isolation_forest"): 0.8865,
        ("pump", "-6dB", "autoencoder"):      0.9233,
    }

    return [{
        "noise_level": row[0],
        "model_name":  row[1],
        "auc_roc":     auc_map.get((machine_type, row[0], row[1]), 0),
        "accuracy":    round(row[3] / row[2], 4) if row[2] > 0 else 0,
        "total":       row[2],
        "correct":     row[3]
    } for row in rows]