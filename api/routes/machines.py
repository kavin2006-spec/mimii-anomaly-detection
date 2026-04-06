from fastapi import APIRouter, HTTPException
from sqlalchemy import text
from src.database.connection import get_engine

router = APIRouter()
engine = get_engine()

@router.get("/")
def get_machines():
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT m.id, m.machine_type, m.machine_id, m.noise_level,
                   COUNT(DISTINCT ac.id) as total_clips,
                   SUM(CASE WHEN ac.label = 'normal' THEN 1 ELSE 0 END) as normal_clips,
                   SUM(CASE WHEN ac.label = 'abnormal' THEN 1 ELSE 0 END) as abnormal_clips
            FROM machines m
            LEFT JOIN audio_clips ac ON ac.machine_fk = m.id
            GROUP BY m.id, m.machine_type, m.machine_id, m.noise_level
        """)).fetchall()

    return [{
        "id":             row[0],
        "machine_type":   row[1],
        "machine_id":     row[2],
        "noise_level":    row[3],
        "total_clips":    row[4],
        "normal_clips":   row[5],
        "abnormal_clips": row[6]
    } for row in rows]

@router.get("/{machine_id}")
def get_machine(machine_id: int):
    with engine.connect() as conn:
        row = conn.execute(text(
            "SELECT * FROM machines WHERE id = :id"
        ), {"id": machine_id}).fetchone()

    if not row:
        raise HTTPException(status_code=404, detail="Machine not found")

    return {
        "id":           row[0],
        "machine_type": row[1],
        "machine_id":   row[2],
        "noise_level":  row[3]
    }