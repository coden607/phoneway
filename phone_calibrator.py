"""
phone_calibrator.py — Physical Scale Sensor Calibration Module

Implements physical scale sensor calibration for smartphone accelerometer/deflection weighing:
- Zero tare baseline estimation and noise floor characterization
- Deflection sensitivity calibration against known reference masses (e.g. US nickel = 5.0 g)
- 3D gravity tilt compensation vector mathematics (pitch and roll angles)
- Sensor noise floor variance, standard deviation, and RMS estimation
"""

import math
import time
from typing import Dict, List, Optional, Tuple, Union


class PhoneScaleCalibrator:
    """
    Calibrates physical smartphone accelerometer deflection sensors for precision weighing.
    
    Translates raw accelerometer deflection (m/s^2 or G) into calibrated grams
    by establishing tare baseline, noise floor variance, tilt compensation,
    and deflection sensitivity (delta sensor units per gram).
    """

    def __init__(
        self,
        default_sensitivity: float = 0.02,
        default_tare: float = 0.0,
        noise_floor_threshold: float = 0.0022
    ):
        """
        Initialize calibrator with default physical sensor parameters.
        
        :param default_sensitivity: Default deflection sensitivity in sensor_units/gram.
        :param default_tare: Default zero tare offset in sensor units.
        :param noise_floor_threshold: Minimum baseline noise floor threshold.
        """
        self.default_sensitivity = default_sensitivity
        self.default_tare = default_tare
        self.noise_floor_threshold = noise_floor_threshold
        self.calibration_data: Optional[Dict[str, Union[float, bool, dict]]] = None

    @staticmethod
    def calculate_variance(samples: List[float]) -> float:
        """Calculate sample variance s^2."""
        if not samples or len(samples) < 2:
            return 0.0
        n = len(samples)
        mean = sum(samples) / n
        sum_sq = sum((x - mean) ** 2 for x in samples)
        return sum_sq / (n - 1)

    @staticmethod
    def calculate_rms(samples: List[float], baseline: Optional[float] = None) -> float:
        """Calculate Root Mean Square (RMS) deviation from baseline or mean."""
        if not samples:
            return 0.0
        ref = sum(samples) / len(samples) if baseline is None else baseline
        sum_sq = sum((x - ref) ** 2 for x in samples)
        return math.sqrt(sum_sq / len(samples))

    @staticmethod
    def compensate_tilt(raw_reading: float, pitch_deg: float = 0.0, roll_deg: float = 0.0) -> float:
        """
        Compensate raw deflection for 3D gravitational tilt vector.
        
        Gravity acting normal to the phone surface is attenuated by cos(pitch) * cos(roll).
        Deflection along the gravity axis is compensated by dividing by the cosine product.
        """
        pitch_rad = math.radians(pitch_deg)
        roll_rad = math.radians(roll_deg)
        cos_factor = math.cos(pitch_rad) * math.cos(roll_rad)
        
        # Guard against near-vertical singularities
        if cos_factor < 0.2:
            return raw_reading
        return raw_reading / cos_factor

    def calibrate_tare(self, tare_readings: List[float]) -> Dict[str, float]:
        """
        Calibrate zero tare baseline and estimate sensor noise floor.
        
        :param tare_readings: List of accelerometer readings taken when phone is empty at rest.
        :return: Dict containing tare baseline, noise variance, std dev, and RMS.
        """
        if not tare_readings:
            return {
                "tare_baseline": self.default_tare,
                "noise_floor_variance": 0.0001,
                "noise_floor_std_dev": 0.01,
                "noise_floor_rms": 0.01,
                "sample_count": 0
            }
        
        n = len(tare_readings)
        tare_baseline = sum(tare_readings) / n
        variance = self.calculate_variance(tare_readings)
        std_dev = math.sqrt(variance)
        rms = self.calculate_rms(tare_readings, baseline=tare_baseline)
        
        return {
            "tare_baseline": tare_baseline,
            "noise_floor_variance": variance,
            "noise_floor_std_dev": std_dev,
            "noise_floor_rms": rms,
            "sample_count": n
        }

    def calibrate_sensitivity(
        self,
        tare_baseline: float,
        loaded_readings: List[float],
        reference_mass: float = 5.0,
        pitch_deg: float = 0.0,
        roll_deg: float = 0.0
    ) -> Dict[str, float]:
        """
        Calibrate deflection sensitivity (sensor_units / gram) using a known reference mass.
        
        Standard reference mass is typically a US nickel (nominal 5.000 g).
        
        :param tare_baseline: Zero tare baseline reading.
        :param loaded_readings: Sensor readings under reference load.
        :param reference_mass: Known mass of reference object in grams (must be > 0).
        :param pitch_deg: Pitch angle during calibration.
        :param roll_deg: Roll angle during calibration.
        :return: Dict containing sensitivity, deflection, and statistics.
        """
        if reference_mass <= 0:
            raise ValueError(f"reference_mass must be strictly positive, got {reference_mass}")
        if not loaded_readings:
            raise ValueError("loaded_readings cannot be empty for sensitivity calibration")
        
        n = len(loaded_readings)
        loaded_mean = sum(loaded_readings) / n
        raw_deflection = loaded_mean - tare_baseline
        
        # Compensate deflection for tilt
        compensated_deflection = self.compensate_tilt(raw_deflection, pitch_deg, roll_deg)
        
        if abs(compensated_deflection) < 1e-7:
            sensitivity = self.default_sensitivity
        else:
            sensitivity = abs(compensated_deflection) / reference_mass
            
        loaded_variance = self.calculate_variance(loaded_readings)
        
        return {
            "sensitivity": sensitivity,
            "reference_mass": reference_mass,
            "raw_deflection": raw_deflection,
            "compensated_deflection": compensated_deflection,
            "loaded_mean": loaded_mean,
            "loaded_variance": loaded_variance,
            "sample_count": n
        }

    def calibrate_two_point(
        self,
        p1_raw: float,
        p1_grams: float,
        p2_raw: float,
        p2_grams: float
    ) -> Dict[str, float]:
        """
        Compute high-precision two-point linear calibration curve.
        """
        delta_raw = p2_raw - p1_raw
        if abs(delta_raw) < 1e-9:
            raise ValueError("Calibration points cannot have identical raw readings")
        slope = (p2_grams - p1_grams) / delta_raw
        intercept = p1_grams - slope * p1_raw
        return {
            "slope": slope,
            "intercept": intercept
        }

    def calibrate_sensor(
        self,
        tare_readings: List[float],
        reference_mass: float = 5.0,
        loaded_readings: Optional[List[float]] = None,
        pitch_deg: float = 0.0,
        roll_deg: float = 0.0
    ) -> Dict[str, Union[float, bool, dict]]:
        """
        Execute full sensor calibration pipeline:
        1. Characterize zero tare baseline and noise floor variance.
        2. Calculate deflection sensitivity with reference mass (e.g. 5.0g nickel).
        3. Establish tilt compensation parameters.
        
        :param tare_readings: Sensor readings under zero load.
        :param reference_mass: Known reference mass in grams (e.g. 5.0).
        :param loaded_readings: Sensor readings under reference mass load.
        :param pitch_deg: Initial pitch tilt angle.
        :param roll_deg: Initial roll tilt angle.
        :return: Full calibration dataset dictionary.
        """
        tare_info = self.calibrate_tare(tare_readings)
        tare_baseline = tare_info["tare_baseline"]
        
        if loaded_readings is not None and len(loaded_readings) > 0:
            sens_info = self.calibrate_sensitivity(
                tare_baseline=tare_baseline,
                loaded_readings=loaded_readings,
                reference_mass=reference_mass,
                pitch_deg=pitch_deg,
                roll_deg=roll_deg
            )
            sensitivity = sens_info["sensitivity"]
        else:
            sensitivity = self.default_sensitivity

        pitch_rad = math.radians(pitch_deg)
        roll_rad = math.radians(roll_deg)
        cos_factor = math.cos(pitch_rad) * math.cos(roll_rad)

        self.calibration_data = {
            "is_calibrated": True,
            "tare_baseline": tare_baseline,
            "sensitivity": sensitivity,
            "reference_mass": reference_mass,
            "noise_floor_variance": tare_info["noise_floor_variance"],
            "noise_floor_std_dev": tare_info["noise_floor_std_dev"],
            "noise_floor_rms": tare_info["noise_floor_rms"],
            "sample_count": tare_info["sample_count"],
            "tilt_compensation": {
                "pitch_deg": pitch_deg,
                "roll_deg": roll_deg,
                "cos_factor": cos_factor
            },
            "timestamp": time.time()
        }
        return self.calibration_data


# Module-level convenience functions matching PROJECT.md and DISPATCH.md interface contracts

def calibrate_sensor(
    tare_readings: List[float],
    reference_mass: float = 5.0,
    loaded_readings: Optional[List[float]] = None,
    pitch_deg: float = 0.0,
    roll_deg: float = 0.0
) -> Dict[str, Union[float, bool, dict]]:
    """
    Module-level function to perform complete physical scale sensor calibration.
    """
    calibrator = PhoneScaleCalibrator()
    return calibrator.calibrate_sensor(
        tare_readings=tare_readings,
        reference_mass=reference_mass,
        loaded_readings=loaded_readings,
        pitch_deg=pitch_deg,
        roll_deg=roll_deg
    )


def compensate_tilt(raw_reading: float, pitch_deg: float = 0.0, roll_deg: float = 0.0) -> float:
    """
    Module-level function for 3D tilt compensation.
    """
    return PhoneScaleCalibrator.compensate_tilt(raw_reading, pitch_deg, roll_deg)


def estimate_noise_floor(tare_readings: List[float]) -> Dict[str, float]:
    """
    Module-level helper to estimate sensor noise floor metrics from tare readings.
    """
    calibrator = PhoneScaleCalibrator()
    return calibrator.calibrate_tare(tare_readings)
