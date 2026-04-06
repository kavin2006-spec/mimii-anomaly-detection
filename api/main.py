from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from api.routes import machines, predictions, analytics

app = FastAPI(
    title="MIMII Anomaly Detection API",
    description="Industrial machine anomaly detection using fan audio",
    version="1.0.0"
)

# Allow React frontend to talk to this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(machines.router,    prefix="/machines",    tags=["machines"])
app.include_router(predictions.router, prefix="/predictions", tags=["predictions"])
app.include_router(analytics.router,   prefix="/analytics",   tags=["analytics"])

@app.get("/")
def root():
    return {"status": "ok", "message": "MIMII Anomaly Detection API running"}