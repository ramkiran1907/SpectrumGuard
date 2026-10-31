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
from gemma_client import explain_incident, ask_gemma
import httpx


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


class ChatRequest(BaseModel):
    query: str
    telemetry: dict | None = None


# ── Endpoints ────────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "SpectrumGuard",
        "status": "operational",
        "ai_engine": "Gemma 4 (Ollama)",
    }


@app.get("/health")
async def health():
    gemma_status = "offline"
    model_name = "gemma4"
    try:
        async with httpx.AsyncClient(timeout=3) as client:
            res = await client.get("http://localhost:11434/api/tags")
            if res.status_code == 200:
                models = res.json().get("models", [])
                gemma_status = "connected"
                names = [m.get("name") for m in models]
                if any("gemma4" in n for n in names):
                    gemma_status = "gemma4_ready"
    except Exception:
        pass

    return {
        "status": "healthy",
        "gemma": {
            "status": gemma_status,
            "model": model_name,
            "provider": "Ollama Local",
            "url": "http://localhost:11434",
        },
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
        "model": "gemma4:latest",
    }


@app.post("/chat")
async def chat(req: ChatRequest):
    response, source = await ask_gemma(req.query, req.telemetry)
    return {
        "response": response,
        "source": source,
        "model": "gemma4:latest",
    }



# ── Entry Point ──────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
