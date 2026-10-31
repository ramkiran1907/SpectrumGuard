"""
SpectrumGuard — RF Spectrum Safety Monitor for Drone Operations
================================================================
FastAPI backend providing telemetry-based risk assessment with
AI-powered explanations via local Gemma 4 (Ollama).
"""

import sys
import os
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# Ensure backend module imports work
sys.path.insert(0, os.path.dirname(__file__))

from safety_rules import assess_risk
from gemma_client import explain_incident


# ── App Setup ────────────────────────────────────────────────────────────

app = FastAPI(title="SpectrumGuard API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Models ───────────────────────────────────────────────────────────────

class Telemetry(BaseModel):
    packet_loss_percent: float
    rssi_dbm: float
    latency_ms: float
    gps_satellites: int


# ── Endpoints ────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "SpectrumGuard",
        "status": "operational",
    }


@app.post("/analyze")
async def analyze(data: Telemetry):
    telemetry = data.model_dump()
    risk, action = assess_risk(telemetry)
    explanation, source = await explain_incident(telemetry, risk, action)

    return {
        "risk": risk,
        "recommended_action": action,
        "gemma_explanation": explanation,
        "source": source,
    }


# ── Entry Point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
