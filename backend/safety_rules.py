"""
Safety Rules Engine for SpectrumGuard
======================================
Defines and evaluates RF safety rules for drone operations.
Rules cover regulatory compliance (FCC Part 107 analogues),
interference thresholds, and operational safety boundaries.
"""

from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum

from rf_simulator import (
    RFSignal,
    SpectrumSnapshot,
    DronePosition,
    SignalType,
    FrequencyBand,
)


class RuleSeverity(str, Enum):
    """Severity level of a safety rule violation."""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class RuleAction(str, Enum):
    """Recommended action when a rule is violated."""
    LOG = "log"
    ALERT = "alert"
    REDUCE_POWER = "reduce_power"
    CHANGE_FREQUENCY = "change_frequency"
    RETURN_TO_HOME = "return_to_home"
    LAND_IMMEDIATELY = "land_immediately"


class RuleViolation(BaseModel):
    """Represents a detected rule violation."""
    rule_id: str = Field(..., description="Unique rule identifier")
    rule_name: str = Field(..., description="Human-readable rule name")
    severity: RuleSeverity
    action: RuleAction
    message: str = Field(..., description="Detailed violation description")
    signal: Optional[RFSignal] = Field(default=None, description="The offending signal, if any")
    metadata: dict = Field(default_factory=dict, description="Additional violation context")


class SafetyReport(BaseModel):
    """Complete safety assessment for a spectrum snapshot."""
    timestamp: float
    violations: list[RuleViolation] = Field(default_factory=list)
    is_safe: bool = Field(default=True, description="Overall safety status")
    recommended_action: RuleAction = Field(default=RuleAction.LOG)
    summary: str = Field(default="All clear — no safety violations detected.")


class SafetyRulesEngine:
    """
    Evaluates RF spectrum snapshots against a set of safety rules.

    Rules are designed to protect drone operations from:
    - RF jamming attacks
    - Excessive interference
    - Spectrum overcrowding
    - Signal loss conditions
    - Regulatory boundary violations
    """

    # Configurable thresholds
    JAMMER_POWER_THRESHOLD_DBM = -30.0
    INTERFERENCE_POWER_THRESHOLD_DBM = -40.0
    MAX_OCCUPANCY_PCT = 75.0
    MIN_CONTROL_SNR_DB = 10.0
    MIN_VIDEO_SNR_DB = 8.0
    MAX_ALTITUDE_M = 120.0  # FAA Part 107 ceiling
    MIN_BATTERY_PCT = 15.0
    NOISE_FLOOR_ALERT_DBM = -90.0

    def __init__(self):
        self._custom_rules: list[callable] = []

    def evaluate(
        self, snapshot: SpectrumSnapshot, drone: DronePosition
    ) -> SafetyReport:
        """
        Run all safety rules against a spectrum snapshot and drone telemetry.

        Returns a SafetyReport with all detected violations and recommendations.
        """
        violations: list[RuleViolation] = []

        violations.extend(self._check_jammer_presence(snapshot))
        violations.extend(self._check_interference_levels(snapshot))
        violations.extend(self._check_spectrum_occupancy(snapshot))
        violations.extend(self._check_control_link_quality(snapshot))
        violations.extend(self._check_video_link_quality(snapshot))
        violations.extend(self._check_noise_floor(snapshot))
        violations.extend(self._check_altitude_compliance(drone))
        violations.extend(self._check_battery_level(drone))

        # Run any custom rules
        for rule_fn in self._custom_rules:
            result = rule_fn(snapshot, drone)
            if result:
                violations.extend(result)

        # Determine overall safety and recommended action
        is_safe = not any(
            v.severity in (RuleSeverity.CRITICAL, RuleSeverity.EMERGENCY)
            for v in violations
        )

        recommended_action = self._determine_action(violations)
        summary = self._build_summary(violations, is_safe)

        return SafetyReport(
            timestamp=snapshot.timestamp,
            violations=violations,
            is_safe=is_safe,
            recommended_action=recommended_action,
            summary=summary,
        )

    def add_custom_rule(self, rule_fn: callable) -> None:
        """Register a custom rule function. Must accept (snapshot, drone) and return list[RuleViolation] or None."""
        self._custom_rules.append(rule_fn)

    # ── Individual Rule Checks ──────────────────────────────────────────

    def _check_jammer_presence(self, snapshot: SpectrumSnapshot) -> list[RuleViolation]:
        """Rule SG-001: Detect active RF jammers."""
        violations = []
        for signal in snapshot.signals:
            if signal.signal_type == SignalType.JAMMER:
                severity = (
                    RuleSeverity.EMERGENCY
                    if signal.power_dbm > self.JAMMER_POWER_THRESHOLD_DBM
                    else RuleSeverity.CRITICAL
                )
                violations.append(
                    RuleViolation(
                        rule_id="SG-001",
                        rule_name="Jammer Detection",
                        severity=severity,
                        action=RuleAction.LAND_IMMEDIATELY if severity == RuleSeverity.EMERGENCY else RuleAction.RETURN_TO_HOME,
                        message=f"Active jammer detected at {signal.frequency_mhz} MHz "
                                f"with power {signal.power_dbm} dBm. "
                                f"Signal bandwidth: {signal.bandwidth_mhz} MHz.",
                        signal=signal,
                        metadata={"band": snapshot.band.value},
                    )
                )
        return violations

    def _check_interference_levels(self, snapshot: SpectrumSnapshot) -> list[RuleViolation]:
        """Rule SG-002: Check for excessive RF interference."""
        violations = []
        for signal in snapshot.signals:
            if (
                signal.signal_type == SignalType.INTERFERENCE
                and signal.power_dbm > self.INTERFERENCE_POWER_THRESHOLD_DBM
            ):
                violations.append(
                    RuleViolation(
                        rule_id="SG-002",
                        rule_name="Excessive Interference",
                        severity=RuleSeverity.WARNING,
                        action=RuleAction.CHANGE_FREQUENCY,
                        message=f"High interference at {signal.frequency_mhz} MHz "
                                f"({signal.power_dbm} dBm exceeds "
                                f"{self.INTERFERENCE_POWER_THRESHOLD_DBM} dBm threshold).",
                        signal=signal,
                    )
                )
        return violations

    def _check_spectrum_occupancy(self, snapshot: SpectrumSnapshot) -> list[RuleViolation]:
        """Rule SG-003: Monitor overall spectrum occupancy."""
        if snapshot.total_occupancy_pct > self.MAX_OCCUPANCY_PCT:
            return [
                RuleViolation(
                    rule_id="SG-003",
                    rule_name="Spectrum Overcrowding",
                    severity=RuleSeverity.WARNING,
                    action=RuleAction.CHANGE_FREQUENCY,
                    message=f"Spectrum occupancy at {snapshot.total_occupancy_pct}% "
                            f"exceeds {self.MAX_OCCUPANCY_PCT}% threshold on "
                            f"{snapshot.band.value} band.",
                    metadata={"occupancy_pct": snapshot.total_occupancy_pct},
                )
            ]
        return []

    def _check_control_link_quality(self, snapshot: SpectrumSnapshot) -> list[RuleViolation]:
        """Rule SG-004: Verify drone control link signal quality."""
        violations = []
        control_signals = [
            s for s in snapshot.signals if s.signal_type == SignalType.DRONE_CONTROL
        ]
        for signal in control_signals:
            if signal.snr_db < self.MIN_CONTROL_SNR_DB:
                violations.append(
                    RuleViolation(
                        rule_id="SG-004",
                        rule_name="Control Link Degradation",
                        severity=RuleSeverity.CRITICAL,
                        action=RuleAction.RETURN_TO_HOME,
                        message=f"Control link SNR ({signal.snr_db} dB) below minimum "
                                f"threshold ({self.MIN_CONTROL_SNR_DB} dB). "
                                f"Risk of control loss.",
                        signal=signal,
                    )
                )
        return violations

    def _check_video_link_quality(self, snapshot: SpectrumSnapshot) -> list[RuleViolation]:
        """Rule SG-005: Verify drone video downlink quality."""
        violations = []
        video_signals = [
            s for s in snapshot.signals if s.signal_type == SignalType.DRONE_VIDEO
        ]
        for signal in video_signals:
            if signal.snr_db < self.MIN_VIDEO_SNR_DB:
                violations.append(
                    RuleViolation(
                        rule_id="SG-005",
                        rule_name="Video Link Degradation",
                        severity=RuleSeverity.WARNING,
                        action=RuleAction.ALERT,
                        message=f"Video link SNR ({signal.snr_db} dB) below minimum "
                                f"threshold ({self.MIN_VIDEO_SNR_DB} dB). "
                                f"Video quality may be degraded.",
                        signal=signal,
                    )
                )
        return violations

    def _check_noise_floor(self, snapshot: SpectrumSnapshot) -> list[RuleViolation]:
        """Rule SG-006: Monitor ambient noise floor elevation."""
        if snapshot.noise_floor_dbm > self.NOISE_FLOOR_ALERT_DBM:
            return [
                RuleViolation(
                    rule_id="SG-006",
                    rule_name="Elevated Noise Floor",
                    severity=RuleSeverity.WARNING,
                    action=RuleAction.ALERT,
                    message=f"Noise floor at {snapshot.noise_floor_dbm} dBm is elevated "
                            f"above {self.NOISE_FLOOR_ALERT_DBM} dBm. "
                            f"Possible wideband interference or desensitization.",
                    metadata={"noise_floor_dbm": snapshot.noise_floor_dbm},
                )
            ]
        return []

    def _check_altitude_compliance(self, drone: DronePosition) -> list[RuleViolation]:
        """Rule SG-007: Enforce maximum altitude regulations."""
        if drone.altitude_m > self.MAX_ALTITUDE_M:
            return [
                RuleViolation(
                    rule_id="SG-007",
                    rule_name="Altitude Violation",
                    severity=RuleSeverity.CRITICAL,
                    action=RuleAction.RETURN_TO_HOME,
                    message=f"Drone altitude {drone.altitude_m:.1f} m exceeds "
                            f"regulatory maximum of {self.MAX_ALTITUDE_M} m (FAA Part 107).",
                    metadata={"altitude_m": drone.altitude_m},
                )
            ]
        return []

    def _check_battery_level(self, drone: DronePosition) -> list[RuleViolation]:
        """Rule SG-008: Monitor battery for safe return."""
        if drone.battery_pct < self.MIN_BATTERY_PCT:
            severity = (
                RuleSeverity.EMERGENCY
                if drone.battery_pct < 5.0
                else RuleSeverity.CRITICAL
            )
            action = (
                RuleAction.LAND_IMMEDIATELY
                if drone.battery_pct < 5.0
                else RuleAction.RETURN_TO_HOME
            )
            return [
                RuleViolation(
                    rule_id="SG-008",
                    rule_name="Low Battery",
                    severity=severity,
                    action=action,
                    message=f"Battery at {drone.battery_pct:.1f}% — "
                            f"below safe threshold of {self.MIN_BATTERY_PCT}%.",
                    metadata={"battery_pct": drone.battery_pct},
                )
            ]
        return []

    # ── Helpers ──────────────────────────────────────────────────────────

    def _determine_action(self, violations: list[RuleViolation]) -> RuleAction:
        """Determine the most urgent recommended action from all violations."""
        if not violations:
            return RuleAction.LOG

        priority = [
            RuleAction.LAND_IMMEDIATELY,
            RuleAction.RETURN_TO_HOME,
            RuleAction.CHANGE_FREQUENCY,
            RuleAction.REDUCE_POWER,
            RuleAction.ALERT,
            RuleAction.LOG,
        ]
        for action in priority:
            if any(v.action == action for v in violations):
                return action
        return RuleAction.LOG

    def _build_summary(self, violations: list[RuleViolation], is_safe: bool) -> str:
        """Build a human-readable safety summary."""
        if not violations:
            return "All clear — no safety violations detected."

        counts = {}
        for v in violations:
            counts[v.severity.value] = counts.get(v.severity.value, 0) + 1

        parts = [f"{count} {sev}" for sev, count in counts.items()]
        status = "UNSAFE" if not is_safe else "DEGRADED"
        return f"Status: {status} — {', '.join(parts)} violation(s) detected."


# ── Quick Risk Assessment ────────────────────────────────────────────────

def assess_risk(data: dict) -> tuple[str, str]:
    """
    Fast, threshold-based risk assessment from raw telemetry values.

    Evaluates packet loss, RSSI, latency, and GPS satellite count to
    classify the current situation into one of four risk tiers:
    CRITICAL, HIGH, MEDIUM, or LOW.

    Args:
        data: Dict with keys like packet_loss_percent, rssi_dbm,
              latency_ms, gps_satellites.

    Returns:
        Tuple of (risk_level, recommended_action).
    """
    packet_loss = data.get("packet_loss_percent", 0)
    rssi = data.get("rssi_dbm", -50)
    latency = data.get("latency_ms", 0)
    gps = data.get("gps_satellites", 12)

    if packet_loss >= 50 or rssi <= -95 or gps <= 4:
        return "CRITICAL", "Initiate return-to-home and notify operator"
    if packet_loss >= 25 or rssi <= -85 or latency >= 300:
        return "HIGH", "Switch to backup link/frequency and monitor"
    if packet_loss >= 10 or latency >= 150:
        return "MEDIUM", "Increase monitoring and reduce mission risk"
    return "LOW", "Continue normal operation"
