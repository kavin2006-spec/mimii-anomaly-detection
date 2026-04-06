from pydantic import BaseModel
from typing import Optional
from datetime import datetime

class MachineSchema(BaseModel):
    id: int
    machine_type: str
    machine_id: str
    noise_level: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

class PredictionSchema(BaseModel):
    id: int
    clip_fk: int
    model_name: str
    anomaly_score: float
    predicted_label: str
    true_label: str
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

class PredictResponse(BaseModel):
    filename: str
    model_name: str
    anomaly_score: float
    predicted_label: str
    reconstruction_error: Optional[float]

class ModelComparisonSchema(BaseModel):
    model_name: str
    auc_roc: float
    total_predictions: int
    correct_predictions: int
    accuracy: float