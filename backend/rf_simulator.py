"""
RF Spectrum Simulator for SpectrumGuard
========================================
Generates realistic RF environment data simulating drone communication
channels, interference sources, and spectrum occupancy across common
drone frequency bands (2.4 GHz, 5.8 GHz, 900 MHz).
"""

import random
import math
import time
from typing import Optional
from pydantic import BaseModel, Field
from enum import Enum


class FrequencyBand(str, Enum):
    """Common drone communication frequency bands."""
    ISM_900 = "900MHz"
    ISM_2_4 = "2.4GHz"
    ISM_5_8 = "5.8GHz"


class SignalType(str, Enum):
    """Types of RF signals detected in the environment."""
    DRONE_CONTROL = "drone_control"
    DRONE_VIDEO = "drone_video"
    WIFI = "wifi"
    BLUETOOTH = "bluetooth"
    INTERFERENCE = "interference"
    JAMMER = "jammer"
    UNKNOWN = "unknown"


class RFSignal(BaseModel):
    """Represents a single detected RF signal."""
    frequency_mhz: float = Field(..., description="Center frequency in MHz")
    bandwidth_mhz: float = Field(..., description="Signal bandwidth in MHz")
    power_dbm: float = Field(..., description="Received signal power in dBm")
    signal_type: SignalType = Field(..., description="Classification of the signal")
    snr_db: float = Field(..., description="Signal-to-noise ratio in dB")
    timestamp: float = Field(default_factory=time.time, description="Unix timestamp")
    is_threat: bool = Field(default=False, description="Whether this signal poses a threat")
    source_id: Optional[str] = Field(default=None, description="Identifier of the source if known")


class SpectrumSnapshot(BaseModel):
    """A complete snapshot of the RF environment at a moment in time."""
    timestamp: float = Field(default_factory=time.time)
    signals: list[RFSignal] = Field(default_factory=list)
    noise_floor_dbm: float = Field(default=-100.0, description="Ambient noise floor in dBm")
    band: FrequencyBand = Field(default=FrequencyBand.ISM_2_4)
    total_occupancy_pct: float = Field(default=0.0, description="Percentage of band occupied")
    threat_level: str = Field(default="nominal", description="Overall threat assessment")


class DronePosition(BaseModel):
    """Simulated drone position and telemetry."""
    latitude: float = Field(..., description="Latitude in degrees")
    longitude: float = Field(..., description="Longitude in degrees")
    altitude_m: float = Field(..., description="Altitude in meters AGL")
    heading_deg: float = Field(..., description="Heading in degrees (0-360)")
    speed_mps: float = Field(..., description="Ground speed in m/s")
    battery_pct: float = Field(..., description="Battery remaining percentage")


class RFSimulator:
    """
    Simulates a realistic RF environment for drone operations.

    Generates synthetic spectrum data including legitimate drone signals,
    background RF activity (WiFi, Bluetooth), and potential threat signals
    (jammers, unauthorized transmitters).
    """

    # Frequency band ranges in MHz
    BAND_RANGES = {
        FrequencyBand.ISM_900: (902.0, 928.0),
        FrequencyBand.ISM_2_4: (2400.0, 2483.5),
        FrequencyBand.ISM_5_8: (5725.0, 5875.0),
    }

    # Typical signal parameters by type
    SIGNAL_PROFILES = {
        SignalType.DRONE_CONTROL: {"bw": 2.0, "power_range": (-60, -30), "snr_range": (15, 35)},
        SignalType.DRONE_VIDEO: {"bw": 20.0, "power_range": (-55, -25), "snr_range": (10, 30)},
        SignalType.WIFI: {"bw": 20.0, "power_range": (-80, -40), "snr_range": (5, 25)},
        SignalType.BLUETOOTH: {"bw": 1.0, "power_range": (-85, -50), "snr_range": (5, 20)},
        SignalType.INTERFERENCE: {"bw": 5.0, "power_range": (-70, -40), "snr_range": (3, 15)},
        SignalType.JAMMER: {"bw": 40.0, "power_range": (-20, 0), "snr_range": (20, 50)},
    }

    def __init__(self, seed: Optional[int] = None):
        self._rng = random.Random(seed)
        self._time_offset = 0.0
        self._jammer_active = False
        self._jammer_start_time: Optional[float] = None

        # Simulated drone state
        self._drone = DronePosition(
            latitude=37.7749,
            longitude=-122.4194,
            altitude_m=50.0,
            heading_deg=0.0,
            speed_mps=5.0,
            battery_pct=100.0,
        )

    def _random_frequency(self, band: FrequencyBand) -> float:
        """Generate a random frequency within the given band."""
        lo, hi = self.BAND_RANGES[band]
        return round(self._rng.uniform(lo, hi), 2)

    def _generate_signal(
        self, signal_type: SignalType, band: FrequencyBand
    ) -> RFSignal:
        """Generate a single RF signal of the given type."""
        profile = self.SIGNAL_PROFILES[signal_type]
        freq = self._random_frequency(band)
        power = self._rng.uniform(*profile["power_range"])
        snr = self._rng.uniform(*profile["snr_range"])

        is_threat = signal_type in (SignalType.JAMMER, SignalType.INTERFERENCE)

        return RFSignal(
            frequency_mhz=freq,
            bandwidth_mhz=profile["bw"],
            power_dbm=round(power, 1),
            signal_type=signal_type,
            snr_db=round(snr, 1),
            is_threat=is_threat,
            source_id=f"{signal_type.value}_{self._rng.randint(1000, 9999)}",
        )

    def _update_drone_position(self, dt: float = 1.0) -> None:
        """Advance the simulated drone position."""
        heading_rad = math.radians(self._drone.heading_deg)
        dlat = math.cos(heading_rad) * self._drone.speed_mps * dt / 111320.0
        dlng = (
            math.sin(heading_rad)
            * self._drone.speed_mps
            * dt
            / (111320.0 * math.cos(math.radians(self._drone.latitude)))
        )
        self._drone.latitude = round(self._drone.latitude + dlat, 6)
        self._drone.longitude = round(self._drone.longitude + dlng, 6)
        self._drone.heading_deg = (self._drone.heading_deg + self._rng.uniform(-5, 5)) % 360
        self._drone.altitude_m = max(
            10.0, self._drone.altitude_m + self._rng.uniform(-2, 2)
        )
        self._drone.battery_pct = max(0.0, self._drone.battery_pct - 0.02 * dt)
        self._drone.speed_mps = max(
            0.0, self._drone.speed_mps + self._rng.uniform(-0.5, 0.5)
        )

    def _calculate_occupancy(self, signals: list[RFSignal], band: FrequencyBand) -> float:
        """Calculate approximate spectrum occupancy percentage."""
        lo, hi = self.BAND_RANGES[band]
        total_bw = hi - lo
        occupied_bw = sum(s.bandwidth_mhz for s in signals)
        return round(min(100.0, (occupied_bw / total_bw) * 100), 1)

    def _assess_threat_level(self, signals: list[RFSignal]) -> str:
        """Determine overall threat level from detected signals."""
        threats = [s for s in signals if s.is_threat]
        if not threats:
            return "nominal"

        has_jammer = any(s.signal_type == SignalType.JAMMER for s in threats)
        if has_jammer:
            return "critical"

        max_threat_power = max(s.power_dbm for s in threats)
        if max_threat_power > -30:
            return "high"
        elif max_threat_power > -50:
            return "elevated"
        return "low"

    def generate_snapshot(
        self,
        band: FrequencyBand = FrequencyBand.ISM_2_4,
        inject_threat: bool = False,
    ) -> SpectrumSnapshot:
        """
        Generate a complete RF environment snapshot.

        Args:
            band: Frequency band to simulate.
            inject_threat: If True, injects a jammer or interference signal.

        Returns:
            SpectrumSnapshot with all detected signals and assessments.
        """
        self._update_drone_position()
        signals: list[RFSignal] = []

        # Always include the drone's own control and video links
        signals.append(self._generate_signal(SignalType.DRONE_CONTROL, band))
        signals.append(self._generate_signal(SignalType.DRONE_VIDEO, band))

        # Background WiFi signals (2-6 typically visible)
        if band in (FrequencyBand.ISM_2_4, FrequencyBand.ISM_5_8):
            for _ in range(self._rng.randint(2, 6)):
                signals.append(self._generate_signal(SignalType.WIFI, band))

        # Occasional Bluetooth (0-3 signals)
        if band == FrequencyBand.ISM_2_4:
            for _ in range(self._rng.randint(0, 3)):
                signals.append(self._generate_signal(SignalType.BLUETOOTH, band))

        # Threat injection
        if inject_threat or self._rng.random() < 0.05:
            threat_type = self._rng.choice([SignalType.JAMMER, SignalType.INTERFERENCE])
            signals.append(self._generate_signal(threat_type, band))

        noise_floor = self._rng.uniform(-105, -95)
        occupancy = self._calculate_occupancy(signals, band)
        threat_level = self._assess_threat_level(signals)

        return SpectrumSnapshot(
            signals=signals,
            noise_floor_dbm=round(noise_floor, 1),
            band=band,
            total_occupancy_pct=occupancy,
            threat_level=threat_level,
        )

    def get_drone_telemetry(self) -> DronePosition:
        """Return the current simulated drone position and telemetry."""
        return self._drone.model_copy()

    def trigger_jammer(self, band: FrequencyBand = FrequencyBand.ISM_2_4) -> RFSignal:
        """Manually trigger a jammer signal for testing."""
        self._jammer_active = True
        self._jammer_start_time = time.time()
        return self._generate_signal(SignalType.JAMMER, band)

    def clear_jammer(self) -> None:
        """Deactivate the simulated jammer."""
        self._jammer_active = False
        self._jammer_start_time = None
