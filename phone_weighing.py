"""
phone_weighing.py — Physical Phone Scale Weighing Engine

Implements physical smartphone scale weighing:
- Genuine mass calculation accurate to 0.1 g display resolution
- Adaptive Sage-Husa Kalman filtering for real-time sensor noise estimation
- Settling stabilization detection based on rolling variance
- Statistical confidence scoring based on SNR, variance, tilt stability, and settled readings
- Automatic Zero Tracking (AZT) drift suppression
"""

import math
from typing import Dict, List, Optional, Tuple, Union

try:
    from phone_calibrator import PhoneScaleCalibrator
except ImportError:
    # Handle direct imports when script is executed in isolated directory
    from .phone_calibrator import PhoneScaleCalibrator


class SageHusaKalmanFilter:
    """
    Adaptive Kalman Filter with Sage-Husa measurement noise estimation.
    Dynamically estimates and updates measurement noise covariance R from innovation residuals.
    Ported from PhoneWay's precision filtering architecture.
    """

    def __init__(
        self,
        R: float = 0.05,
        Q: float = 0.005,
        P0: float = 1.0,
        epsilon: float = 0.05,
        R_max: float = 4.0
    ):
        """
        :param R: Initial measurement noise covariance.
        :param Q: Process noise covariance (random walk model).
        :param P0: Initial estimation error covariance.
        :param epsilon: Forgetting factor for Sage-Husa R adaptation (0.01 - 0.1).
        :param R_max: Maximum physical noise covariance ceiling to prevent filter state freeze.
        """
        self.R = R
        self.Q = Q
        self.P = P0
        self.epsilon = epsilon
        self.R_max = R_max
        self.x: Optional[float] = None
        self.initialized = False

    def update(self, z: float) -> float:
        """
        Update state estimate with incoming measurement z.
        """
        if not self.initialized or self.x is None:
            self.x = z
            self.initialized = True
            return self.x

        # Prediction step
        P_prior = self.P + self.Q

        # Innovation residual
        innovation = z - self.x

        # Sage-Husa adaptive R update
        S = P_prior + self.R
        self.R = (1.0 - self.epsilon) * self.R + self.epsilon * (innovation * innovation - S + self.R)
        self.R = max(1e-6, min(self.R_max, self.R))

        # Kalman gain calculation
        K = P_prior / (P_prior + self.R)

        # State and covariance update
        self.x = self.x + K * innovation
        self.P = (1.0 - K) * P_prior
        return self.x

    def reset(self, initial_value: Optional[float] = None):
        """Reset filter state."""
        self.x = initial_value
        self.P = 1.0
        self.initialized = initial_value is not None


class ExponentialMovingAverage:
    """Fast exponential IIR smoothing filter."""

    def __init__(self, alpha: float = 0.25):
        self.alpha = max(0.01, min(1.0, alpha))
        self.value: Optional[float] = None

    def update(self, v: float) -> float:
        if self.value is None:
            self.value = v
        else:
            self.value = self.alpha * v + (1.0 - self.alpha) * self.value
        return self.value

    def reset(self):
        self.value = None


class PhoneScale:
    """
    Physical smartphone scale processor.
    Calculates object mass from accelerometer deflection readings with 0.1 g display resolution.
    """

    def __init__(
        self,
        calibration_data: Optional[Dict[str, Union[float, bool, dict]]] = None,
        stabilization_tolerance: float = 0.025,
        azt_band_grams: float = 0.02
    ):
        """
        :param calibration_data: Calibration dictionary from PhoneScaleCalibrator.
        :param stabilization_tolerance: Standard deviation threshold in grams for settling.
        :param azt_band_grams: Automatic zero tracking deadband threshold in grams.
        """
        self.calibration_data = calibration_data or {}
        self.stabilization_tolerance = stabilization_tolerance
        self.azt_band_grams = azt_band_grams
        self.calibrator = PhoneScaleCalibrator()

    @staticmethod
    def calculate_variance(samples: List[float]) -> float:
        """Sample variance of a list of floats."""
        if not samples or len(samples) < 2:
            return 0.0
        n = len(samples)
        mean = sum(samples) / n
        return sum((x - mean) ** 2 for x in samples) / (n - 1)

    def detect_settling(
        self,
        samples: List[float],
        window_size: int = 5,
        raw_samples: Optional[List[float]] = None
    ) -> Tuple[bool, float, int]:
        """
        Detect whether the scale has reached mechanical equilibrium (settled).
        
        :param samples: Sequence of mass readings over time.
        :param window_size: Number of trailing samples to analyze for settling.
        :param raw_samples: Optional raw un-filtered mass readings to verify physical equilibrium.
        :return: (is_stable, trailing_variance, settled_count)
        """
        if not samples or len(samples) < 4:
            return False, 999.0, 0

        w = min(len(samples), max(4, window_size))
        trailing_window = samples[-w:]
        var = self.calculate_variance(trailing_window)
        max_allowed_var = self.stabilization_tolerance ** 2

        is_stable = var <= max_allowed_var

        # Defense-in-depth: Verify that raw input variance does not exceed physical stability threshold
        if raw_samples is not None and len(raw_samples) >= 4:
            raw_trailing = raw_samples[-w:]
            raw_var = self.calculate_variance(raw_trailing)
            max_raw_var = (self.stabilization_tolerance * 3.0) ** 2
            if raw_var > max_raw_var:
                is_stable = False

        # Count consecutive settled readings backwards from the end
        settled_count = 0
        window_mean = sum(trailing_window) / len(trailing_window)
        for val in reversed(samples):
            if abs(val - window_mean) <= self.stabilization_tolerance * 2.0:
                settled_count += 1
            else:
                break

        return is_stable, var, settled_count

    def compute_confidence(
        self,
        weight: float,
        variance: float,
        noise_floor_variance: float,
        is_stable: bool,
        settled_count: int,
        pitch_deg: float = 0.0,
        roll_deg: float = 0.0
    ) -> Tuple[float, float]:
        """
        Compute statistical measurement confidence score in [0.0, 1.0].
        
        Evaluates:
        1. Rolling sample variance vs target precision (c_var)
        2. Signal-to-noise ratio in decibels (c_snr)
        3. 3D phone tilt stability (c_tilt)
        4. Settling stabilization duration (c_settle)
        
        :return: (confidence_score, snr_db)
        """
        # 1. Variance factor: exponential decay as variance increases
        # Target variance is (0.015 g)^2 = 0.000225
        sigma_target_sq = 0.0004
        c_var = math.exp(-min(10.0, variance / (2.0 * sigma_target_sq)))

        # 2. Signal-to-Noise Ratio (SNR)
        effective_noise = max(1e-6, variance + noise_floor_variance)
        signal_level = max(0.1, abs(weight))
        snr_ratio = signal_level / math.sqrt(effective_noise)
        snr_db = 20.0 * math.log10(snr_ratio)
        
        # Map SNR dB (0 dB to 30 dB) to [0.0, 1.0]
        c_snr = min(1.0, max(0.0, (snr_db - 2.0) / 28.0))

        # 3. Tilt stability factor
        total_tilt = math.sqrt(pitch_deg ** 2 + roll_deg ** 2)
        if total_tilt <= 1.5:
            c_tilt = 1.0
        elif total_tilt <= 15.0:
            c_tilt = 1.0 - 0.5 * ((total_tilt - 1.5) / 13.5)
        else:
            c_tilt = max(0.1, 0.5 - ((total_tilt - 15.0) / 30.0))

        # 4. Settling factor
        if is_stable:
            c_settle = min(1.0, 0.5 + 0.1 * min(5, settled_count))
        else:
            c_settle = max(0.1, 0.15 * min(3, settled_count))

        # Weighted combination
        confidence = (0.35 * c_var) + (0.30 * c_snr) + (0.15 * c_tilt) + (0.20 * c_settle)
        confidence = min(1.0, max(0.0, confidence))
        return confidence, snr_db

    def weigh(
        self,
        readings: List[float],
        calibration_data: Optional[Dict[str, Union[float, bool, dict]]] = None,
        pitch_deg: float = 0.0,
        roll_deg: float = 0.0
    ) -> Dict[str, Union[float, bool, int]]:
        """
        Process sensor readings to calculate mass accurate to 0.1 g display resolution.
        
        :param readings: Sequence of raw sensor deflection readings (or mass readings).
        :param calibration_data: Optional calibration override.
        :param pitch_deg: Phone pitch tilt angle in degrees.
        :param roll_deg: Phone roll tilt angle in degrees.
        :return: Dict containing {"weight": float, "weight_grams": float, "confidence": float, "stable": bool, ...}
        """
        if not readings:
            return {
                "weight": 0.0,
                "weight_grams": 0.0,
                "confidence": 0.0,
                "stable": False,
                "variance": 0.0,
                "settled_count": 0,
                "snr_db": 0.0,
                "raw_weight": 0.0
            }

        cal = calibration_data or self.calibration_data or {}
        tare_baseline = float(cal.get("tare_baseline", 0.0))
        sensitivity = float(cal.get("sensitivity", 1.0))
        noise_floor_variance = float(cal.get("noise_floor_variance", 0.0001))

        if sensitivity <= 0:
            raise ValueError(f"Invalid calibration sensitivity: {sensitivity} (must be > 0)")

        # Tilt angles from calibration data if not explicitly provided
        tilt_cfg = cal.get("tilt_compensation", {})
        if isinstance(tilt_cfg, dict):
            if pitch_deg == 0.0 and "pitch_deg" in tilt_cfg:
                pitch_deg = float(tilt_cfg["pitch_deg"])
            if roll_deg == 0.0 and "roll_deg" in tilt_cfg:
                roll_deg = float(tilt_cfg["roll_deg"])

        # Convert raw readings to deflection and grams, applying tilt compensation
        kalman = SageHusaKalmanFilter(R=max(0.01, noise_floor_variance), Q=0.005, R_max=4.0)
        filtered_masses: List[float] = []
        raw_masses: List[float] = []

        for r in readings:
            r_comp = PhoneScaleCalibrator.compensate_tilt(r, pitch_deg, roll_deg)
            deflection = r_comp - tare_baseline
            raw_grams = deflection / sensitivity
            raw_masses.append(raw_grams)
            filtered_val = kalman.update(raw_grams)
            filtered_masses.append(filtered_val)

        # Detect settling and stabilization
        is_stable, rolling_var, settled_count = self.detect_settling(
            filtered_masses,
            raw_samples=raw_masses
        )

        # Final filtered mass
        final_mass = filtered_masses[-1]

        # Automatic Zero Tracking (AZT)
        if abs(final_mass) <= self.azt_band_grams:
            final_mass = 0.0

        # Compute statistical confidence score
        confidence, snr_db = self.compute_confidence(
            weight=final_mass,
            variance=rolling_var,
            noise_floor_variance=noise_floor_variance,
            is_stable=is_stable,
            settled_count=settled_count,
            pitch_deg=pitch_deg,
            roll_deg=roll_deg
        )

        # 0.1 g display resolution rounding
        display_weight = round(final_mass, 1)
        if display_weight == -0.0:
            display_weight = 0.0

        return {
            "weight": display_weight,
            "weight_grams": display_weight,
            "confidence": round(confidence, 3),
            "stable": is_stable,
            "variance": round(rolling_var, 6),
            "settled_count": settled_count,
            "snr_db": round(snr_db, 1),
            "raw_weight": round(final_mass, 4)
        }

    def weigh_object(
        self,
        readings: List[float],
        calibration_data: Optional[Dict[str, Union[float, bool, dict]]] = None,
        pitch_deg: float = 0.0,
        roll_deg: float = 0.0
    ) -> Dict[str, Union[float, bool, int]]:
        """Alias for weigh() matching PROJECT.md interface contract."""
        return self.weigh(readings, calibration_data=calibration_data, pitch_deg=pitch_deg, roll_deg=roll_deg)


# Module-level convenience functions matching DISPATCH.md and PROJECT.md interface contracts

def weigh(
    readings: List[float],
    calibration_data: Optional[Dict[str, Union[float, bool, dict]]] = None,
    pitch_deg: float = 0.0,
    roll_deg: float = 0.0
) -> Dict[str, Union[float, bool, int]]:
    """
    Module-level function:
    `def weigh(readings: list[float], calibration_data: dict = None) -> dict:`
    Returning `{"weight": float (rounded to 0.1g), "confidence": float, "stable": bool}`
    """
    scale = PhoneScale(calibration_data=calibration_data)
    return scale.weigh(readings, pitch_deg=pitch_deg, roll_deg=roll_deg)


def weigh_object(
    readings: List[float],
    calibration_data: Optional[Dict[str, Union[float, bool, dict]]] = None,
    pitch_deg: float = 0.0,
    roll_deg: float = 0.0
) -> Dict[str, Union[float, bool, int]]:
    """
    Module-level function:
    `def weigh_object(readings: list[float], calibration_data: dict = None) -> dict:`
    Returning `{"weight_grams": float (rounded to 0.1g), "confidence": float (0.0 to 1.0), "stable": bool}`
    """
    return weigh(readings, calibration_data=calibration_data, pitch_deg=pitch_deg, roll_deg=roll_deg)
