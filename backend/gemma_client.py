"""
Gemma AI Client for SpectrumGuard
==================================
Interfaces with a Gemma model (local or remote) to provide
AI-powered RF spectrum analysis, threat classification,
and natural-language safety recommendations.
"""

import httpx
import json
from typing import Optional
from pydantic import BaseModel, Field

from rf_simulator import SpectrumSnapshot, RFSignal, SignalType


# ── Standalone Ollama Helper ─────────────────────────────────────────────

OLLAMA_URL = "http://localhost:11434/api/generate"
MODEL = "gemma4"


async def explain_incident(telemetry: dict, risk: str, action: str) -> tuple[str, str]:
    """
    Use Gemma 4 via Ollama to produce a concise, operator-facing explanation
    of a safety incident based on telemetry data and rule-engine outputs.
    Gracefully falls back to a deterministic safety briefing if Ollama/model is unavailable.
    """
    prompt = f"""
You are SpectrumGuard, an RF-safety assistant for drone operators.

Telemetry:
{telemetry}

Rule-engine risk level: {risk}
Rule-engine recommended action: {action}

Explain in under 120 words:
1. What the telemetry suggests.
2. Why the recommended action is appropriate.
3. One uncertainty or next check for the operator.

Do not claim the system can jam, hack, or take control of a drone.
"""

    try:
        async with httpx.AsyncClient(timeout=15) as client:
            response = await client.post(
                OLLAMA_URL,
                json={
                    "model": MODEL,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.2},
                },
            )
            if response.status_code == 200:
                data = response.json()
                if "response" in data:
                    return data["response"].strip(), "local_gemma4_ollama"
    except Exception:
        pass

    # Deterministic safety explanation fallback matching the prompt guidelines
    loss = telemetry.get("packet_loss_percent", 0)
    rssi = telemetry.get("rssi_dbm", -50)
    latency = telemetry.get("latency_ms", 0)
    gps = telemetry.get("gps_satellites", 12)

    fallback_explanation = (
        f"1. Telemetry suggests: Elevated packet loss ({loss}%) and high latency ({latency}ms) "
        f"with RSSI at {rssi} dBm indicate significant RF attenuation or channel congestion.\n"
        f"2. Action rationale: '{action}' mitigates link termination and ensures drone flight safety under {risk} conditions.\n"
        f"3. Operator check: Verify backup link frequency clearance, inspect antenna line-of-sight, and monitor GPS lock ({gps} satellites)."
    )
    return fallback_explanation, "fallback_rule_engine"
from safety_rules import SafetyReport, RuleViolation


class GemmaConfig(BaseModel):
    """Configuration for the Gemma model endpoint."""
    base_url: str = Field(
        default="http://localhost:11434",
        description="Base URL of the Gemma-compatible API (e.g., Ollama)",
    )
    model_name: str = Field(
        default="gemma4",
        description="Model identifier to use for inference",
    )
    temperature: float = Field(default=0.3, ge=0.0, le=2.0)
    max_tokens: int = Field(default=1024, ge=64, le=8192)
    timeout_s: float = Field(default=30.0, description="Request timeout in seconds")


class AnalysisResult(BaseModel):
    """Structured result from Gemma analysis."""
    threat_assessment: str = Field(..., description="Natural-language threat summary")
    confidence: float = Field(..., ge=0.0, le=1.0, description="Confidence score")
    recommended_actions: list[str] = Field(default_factory=list)
    risk_factors: list[str] = Field(default_factory=list)
    raw_response: Optional[str] = Field(default=None, description="Raw model output")


class GemmaClient:
    """
    Client for AI-powered spectrum analysis using a Gemma model.

    Sends structured RF data to the model and parses responses into
    actionable safety recommendations. Supports both local (Ollama)
    and remote Gemma-compatible endpoints.
    """

    SYSTEM_PROMPT = """You are SpectrumGuard AI, an expert RF spectrum safety analyst for drone operations.
Your role is to analyze RF spectrum data and provide clear, actionable safety assessments.

When analyzing spectrum data, consider:
1. Signal types and their threat potential (jammers are highest priority)
2. Signal power levels relative to noise floor
3. Spectrum occupancy and congestion levels
4. Control and video link quality
5. Regulatory compliance indicators

Always respond with a JSON object containing these fields:
- "threat_assessment": A concise natural-language summary of the RF environment
- "confidence": A float between 0 and 1 indicating confidence in the assessment
- "recommended_actions": A list of specific actions the operator should take
- "risk_factors": A list of identified risk factors in the current RF environment

Be concise, precise, and prioritize operator safety."""

    def __init__(self, config: Optional[GemmaConfig] = None):
        self._config = config or GemmaConfig()
        self._client = httpx.AsyncClient(
            base_url=self._config.base_url,
            timeout=self._config.timeout_s,
        )

    async def analyze_spectrum(
        self, snapshot: SpectrumSnapshot, safety_report: Optional[SafetyReport] = None
    ) -> AnalysisResult:
        """
        Send spectrum data to Gemma for AI-powered analysis.

        Args:
            snapshot: Current RF environment snapshot.
            safety_report: Optional rule-based safety report for context.

        Returns:
            AnalysisResult with threat assessment and recommendations.
        """
        prompt = self._build_analysis_prompt(snapshot, safety_report)

        try:
            response = await self._chat_completion(prompt)
            return self._parse_analysis_response(response)
        except httpx.ConnectError:
            return self._fallback_analysis(snapshot, safety_report)
        except Exception as e:
            return AnalysisResult(
                threat_assessment=f"AI analysis unavailable: {str(e)}. "
                                  f"Relying on rule-based analysis only.",
                confidence=0.0,
                recommended_actions=["Monitor rule-based alerts", "Check AI service connectivity"],
                risk_factors=["AI analysis offline"],
                raw_response=str(e),
            )

    async def classify_signal(self, signal: RFSignal) -> dict:
        """
        Use Gemma to classify an unknown or suspicious RF signal.

        Returns a dict with classification details.
        """
        prompt = self._build_classification_prompt(signal)

        try:
            response = await self._chat_completion(prompt)
            return json.loads(response)
        except Exception:
            return {
                "classification": signal.signal_type.value,
                "confidence": 0.5,
                "reasoning": "Fallback to rule-based classification",
            }

    async def generate_incident_report(
        self,
        snapshot: SpectrumSnapshot,
        safety_report: SafetyReport,
        violations: list[RuleViolation],
    ) -> str:
        """
        Generate a natural-language incident report for logging.

        Returns a formatted incident report string.
        """
        prompt = self._build_incident_prompt(snapshot, safety_report, violations)

        try:
            return await self._chat_completion(prompt)
        except Exception:
            return self._fallback_incident_report(safety_report, violations)

    # ── API Communication ────────────────────────────────────────────────

    async def _chat_completion(self, prompt: str) -> str:
        """Send a chat completion request to the Gemma endpoint."""
        payload = {
            "model": self._config.model_name,
            "messages": [
                {"role": "system", "content": self.SYSTEM_PROMPT},
                {"role": "user", "content": prompt},
            ],
            "temperature": self._config.temperature,
            "max_tokens": self._config.max_tokens,
            "stream": False,
        }

        # Try OpenAI-compatible endpoint first (vLLM, Ollama, etc.)
        try:
            response = await self._client.post(
                "/v1/chat/completions", json=payload
            )
            response.raise_for_status()
            data = response.json()
            return data["choices"][0]["message"]["content"]
        except (httpx.HTTPStatusError, KeyError):
            pass

        # Fallback to Ollama native API
        ollama_payload = {
            "model": self._config.model_name,
            "prompt": f"{self.SYSTEM_PROMPT}\n\nUser: {prompt}",
            "stream": False,
            "options": {
                "temperature": self._config.temperature,
                "num_predict": self._config.max_tokens,
            },
        }
        response = await self._client.post("/api/generate", json=ollama_payload)
        response.raise_for_status()
        data = response.json()
        return data.get("response", "")

    async def health_check(self) -> dict:
        """Check if the Gemma model endpoint is reachable and responsive."""
        try:
            response = await self._client.get("/v1/models")
            if response.status_code == 200:
                return {"status": "healthy", "models": response.json()}

            # Try Ollama endpoint
            response = await self._client.get("/api/tags")
            if response.status_code == 200:
                return {"status": "healthy", "models": response.json()}

            return {"status": "unhealthy", "error": f"HTTP {response.status_code}"}
        except httpx.ConnectError:
            return {"status": "offline", "error": "Cannot connect to model endpoint"}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    # ── Prompt Builders ──────────────────────────────────────────────────

    def _build_analysis_prompt(
        self, snapshot: SpectrumSnapshot, safety_report: Optional[SafetyReport]
    ) -> str:
        """Build the analysis prompt with spectrum data context."""
        signals_desc = []
        for s in snapshot.signals:
            signals_desc.append(
                f"  - {s.signal_type.value}: {s.frequency_mhz} MHz, "
                f"{s.power_dbm} dBm, SNR {s.snr_db} dB, "
                f"BW {s.bandwidth_mhz} MHz"
                f"{' [THREAT]' if s.is_threat else ''}"
            )

        prompt = f"""Analyze the following RF spectrum snapshot for drone safety:

Band: {snapshot.band.value}
Noise Floor: {snapshot.noise_floor_dbm} dBm
Spectrum Occupancy: {snapshot.total_occupancy_pct}%
Threat Level (rule-based): {snapshot.threat_level}

Detected Signals ({len(snapshot.signals)} total):
{chr(10).join(signals_desc)}
"""

        if safety_report and safety_report.violations:
            violations_desc = [
                f"  - [{v.severity.value}] {v.rule_name}: {v.message}"
                for v in safety_report.violations
            ]
            prompt += f"""
Rule-Based Violations ({len(safety_report.violations)} total):
{chr(10).join(violations_desc)}

Rule Engine Recommendation: {safety_report.recommended_action.value}
"""

        prompt += """
Provide your analysis as a JSON object with keys:
"threat_assessment", "confidence", "recommended_actions", "risk_factors"
"""
        return prompt

    def _build_classification_prompt(self, signal: RFSignal) -> str:
        """Build a prompt for signal classification."""
        return f"""Classify the following unknown RF signal:

Frequency: {signal.frequency_mhz} MHz
Bandwidth: {signal.bandwidth_mhz} MHz
Power: {signal.power_dbm} dBm
SNR: {signal.snr_db} dB
Current Classification: {signal.signal_type.value}

Respond with a JSON object containing:
"classification" (one of: drone_control, drone_video, wifi, bluetooth, interference, jammer, unknown),
"confidence" (0-1),
"reasoning" (brief explanation)
"""

    def _build_incident_prompt(
        self,
        snapshot: SpectrumSnapshot,
        safety_report: SafetyReport,
        violations: list[RuleViolation],
    ) -> str:
        """Build a prompt for incident report generation."""
        violations_text = "\n".join(
            f"- [{v.severity.value}] {v.rule_name}: {v.message}" for v in violations
        )
        return f"""Generate a concise incident report for the following RF safety event:

Timestamp: {snapshot.timestamp}
Band: {snapshot.band.value}
Threat Level: {snapshot.threat_level}
Total Signals: {len(snapshot.signals)}
Noise Floor: {snapshot.noise_floor_dbm} dBm

Violations:
{violations_text}

Recommended Action: {safety_report.recommended_action.value}

Write a professional incident report suitable for logging and review.
Include: summary, timeline, impact assessment, and recommended follow-up actions.
"""

    # ── Fallbacks ────────────────────────────────────────────────────────

    def _fallback_analysis(
        self, snapshot: SpectrumSnapshot, safety_report: Optional[SafetyReport]
    ) -> AnalysisResult:
        """Provide rule-based analysis when the AI model is unavailable."""
        threats = [s for s in snapshot.signals if s.is_threat]
        risk_factors = []
        actions = []

        if threats:
            risk_factors.append(f"{len(threats)} threat signal(s) detected")
            actions.append("Investigate threat signals immediately")

        if snapshot.total_occupancy_pct > 50:
            risk_factors.append(f"High spectrum occupancy ({snapshot.total_occupancy_pct}%)")
            actions.append("Consider switching to less congested band")

        if snapshot.noise_floor_dbm > -95:
            risk_factors.append(f"Elevated noise floor ({snapshot.noise_floor_dbm} dBm)")

        if safety_report and not safety_report.is_safe:
            actions.append(f"Follow rule engine recommendation: {safety_report.recommended_action.value}")

        assessment = (
            f"Rule-based analysis (AI offline): "
            f"Threat level is {snapshot.threat_level}. "
            f"{len(threats)} threat(s) and {len(snapshot.signals)} total signals detected "
            f"on {snapshot.band.value} band."
        )

        return AnalysisResult(
            threat_assessment=assessment,
            confidence=0.6,
            recommended_actions=actions or ["Continue monitoring"],
            risk_factors=risk_factors or ["None identified"],
        )

    def _fallback_incident_report(
        self, safety_report: SafetyReport, violations: list[RuleViolation]
    ) -> str:
        """Generate a basic incident report without AI."""
        lines = [
            "═══ SPECTRUMGUARD INCIDENT REPORT ═══",
            f"Timestamp: {safety_report.timestamp}",
            f"Status: {'SAFE' if safety_report.is_safe else 'UNSAFE'}",
            f"Recommended Action: {safety_report.recommended_action.value}",
            "",
            "Violations:",
        ]
        for v in violations:
            lines.append(f"  [{v.severity.value.upper()}] {v.rule_name}")
            lines.append(f"    {v.message}")
        lines.append("")
        lines.append(safety_report.summary)
        return "\n".join(lines)

    async def close(self) -> None:
        """Close the HTTP client."""
        await self._client.aclose()
