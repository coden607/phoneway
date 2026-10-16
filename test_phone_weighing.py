"""
test_phone_weighing.py — Unit Tests for Phone Scale Calibration & Weighing

Verifies:
1. Tare baseline calibration and noise floor estimation.
2. Accuracy with known reference mass (5.0 g US nickel) with error <= 0.09 g.
3. 5-verification accuracy ledger consistency per PRD-tenth-gram-accuracy.md.
4. Multi-reference coin ladder accuracy (Dime 2.268g, Penny 2.500g, Nickel 5.000g, Quarter 5.670g).
5. Confidence scoring under calm vs noisy accelerometer readings.
6. Settling stabilization detection (transient vs equilibrium).
7. 3D tilt compensation accuracy under inclined sensor angles.
8. Zero tare and empty reading edge cases.
9. Verification of zero Twilio imports or telephony references.
"""

import math
import random
import sys
from pathlib import Path

import pytest

# Ensure local modules are importable
current_dir = Path(__file__).resolve().parent
if str(current_dir) not in sys.path:
    sys.path.insert(0, str(current_dir))

from phone_calibrator import (
    PhoneScaleCalibrator,
    calibrate_sensor,
    compensate_tilt,
    estimate_noise_floor,
)
from phone_weighing import (
    PhoneScale,
    SageHusaKalmanFilter,
    weigh,
    weigh_object,
)


def generate_sensor_series(
    baseline: float,
    mass_g: float,
    sensitivity: float,
    std_dev: float,
    count: int = 30,
    seed: int = 42
) -> list[float]:
    """Helper to simulate physical accelerometer deflection samples."""
    rng = random.Random(seed)
    mean_deflection = baseline + (mass_g * sensitivity)
    return [rng.gauss(mean_deflection, std_dev) for _ in range(count)]


class TestTareCalibration:
    """Tests for zero tare baseline and sensor noise floor characterization."""

    def test_tare_baseline_estimation(self):
        calibrator = PhoneScaleCalibrator()
        # Simulated resting phone on compliant surface with mean offset 0.045 m/s^2
        raw_tare_samples = [0.044, 0.046, 0.045, 0.045, 0.044, 0.046, 0.045, 0.045]
        result = calibrator.calibrate_tare(raw_tare_samples)

        assert abs(result["tare_baseline"] - 0.045) < 1e-4
        assert result["noise_floor_variance"] > 0
        assert result["noise_floor_std_dev"] > 0
        assert result["noise_floor_rms"] > 0
        assert result["sample_count"] == len(raw_tare_samples)

    def test_estimate_noise_floor_helper(self):
        samples = [0.010, 0.012, 0.009, 0.011, 0.010]
        noise_info = estimate_noise_floor(samples)
        assert abs(noise_info["tare_baseline"] - 0.0104) < 1e-4
        assert noise_info["noise_floor_variance"] < 0.001

    def test_empty_tare_defaults(self):
        calibrator = PhoneScaleCalibrator(default_tare=0.0)
        result = calibrator.calibrate_tare([])
        assert result["tare_baseline"] == 0.0
        assert result["sample_count"] == 0


class TestDeflectionSensitivityCalibration:
    """Tests for deflection sensitivity calibration against known reference masses."""

    def test_sensitivity_calibration_with_5g_reference(self):
        calibrator = PhoneScaleCalibrator()
        tare_readings = [0.050] * 20
        # Reference mass: standard US nickel = 5.0 g
        # If sensitivity is 0.020 sensor units per gram, loaded mean is 0.050 + 5.0 * 0.020 = 0.150
        loaded_readings = generate_sensor_series(
            baseline=0.050,
            mass_g=5.0,
            sensitivity=0.020,
            std_dev=0.0005,
            count=25,
            seed=101
        )

        cal_data = calibrator.calibrate_sensor(
            tare_readings=tare_readings,
            reference_mass=5.0,
            loaded_readings=loaded_readings
        )

        assert cal_data["is_calibrated"] is True
        assert abs(cal_data["tare_baseline"] - 0.050) < 1e-4
        assert abs(cal_data["sensitivity"] - 0.020) < 0.001
        assert cal_data["reference_mass"] == 5.0

    def test_two_point_calibration(self):
        calibrator = PhoneScaleCalibrator()
        # Point 1: 0g at 0.050 deflection; Point 2: 5g at 0.150 deflection
        curve = calibrator.calibrate_two_point(p1_raw=0.050, p1_grams=0.0, p2_raw=0.150, p2_grams=5.0)
        assert abs(curve["slope"] - 50.0) < 1e-3  # 5.0 / 0.100 = 50 grams per sensor unit
        assert abs(curve["intercept"] - (-2.5)) < 1e-3


class TestWeighingAccuracy:
    """Tests accuracy with known masses verifying error <= 0.09 g (accurate to 0.1 g)."""

    @pytest.fixture
    def calibrated_scale(self):
        """Set up calibrated scale data using a standard 5.0g reference mass."""
        tare_readings = [0.040] * 30
        loaded_readings = [0.040 + (5.0 * 0.025)] * 30  # sensitivity = 0.025 units/g
        cal_data = calibrate_sensor(
            tare_readings=tare_readings,
            reference_mass=5.0,
            loaded_readings=loaded_readings
        )
        return cal_data

    def test_accuracy_with_known_5g_mass(self, calibrated_scale):
        # Generate 35 calm sensor samples for a 5.0 g reference mass with accelerometer noise
        readings = generate_sensor_series(
            baseline=calibrated_scale["tare_baseline"],
            mass_g=5.0,
            sensitivity=calibrated_scale["sensitivity"],
            std_dev=0.0003,
            count=35,
            seed=202
        )

        result = weigh(readings, calibration_data=calibrated_scale)

        # Mandatory accuracy invariant: error <= 0.09 g
        measured_weight = result["weight"]
        error = abs(measured_weight - 5.0)
        assert error <= 0.09, f"Measured error {error} exceeded 0.09g threshold"
        assert measured_weight == 5.0
        assert result["stable"] is True
        assert result["confidence"] >= 0.85

    def test_five_consecutive_verifications_under_0_09g(self, calibrated_scale):
        """
        Verify that 5 consecutive trials have error <= 0.09 g,
        satisfying PhoneWay's PRD requirement for displayed ±0.1 g accuracy.
        """
        errors = []
        for trial in range(5):
            readings = generate_sensor_series(
                baseline=calibrated_scale["tare_baseline"],
                mass_g=5.0,
                sensitivity=calibrated_scale["sensitivity"],
                std_dev=0.0004,
                count=30,
                seed=300 + trial
            )
            result = weigh(readings, calibration_data=calibrated_scale)
            err = abs(result["weight"] - 5.0)
            errors.append(err)
            assert err <= 0.09, f"Trial {trial+1} error {err} > 0.09g"

        worst_error = max(errors)
        assert worst_error <= 0.09

    def test_coin_ladder_accuracy(self, calibrated_scale):
        """
        Test nominal US coin ladder masses:
        - Dime: 2.268 g (rounds to 2.3 g)
        - Penny: 2.500 g (rounds to 2.5 g)
        - Quarter: 5.670 g (rounds to 5.7 g)
        """
        coins = [
            ("Dime", 2.268, 2.3),
            ("Penny", 2.500, 2.5),
            ("Quarter", 5.670, 5.7),
        ]

        for name, nominal_mass, expected_display in coins:
            readings = generate_sensor_series(
                baseline=calibrated_scale["tare_baseline"],
                mass_g=nominal_mass,
                sensitivity=calibrated_scale["sensitivity"],
                std_dev=0.0002,
                count=30,
                seed=400 + int(nominal_mass * 10)
            )
            result = weigh(readings, calibration_data=calibrated_scale)
            # Check error against true nominal mass is within 0.09 g
            error = abs(result["weight"] - nominal_mass)
            assert error <= 0.09, f"{name}: error {error} exceeds 0.09g"
            assert result["weight"] == expected_display


class TestConfidenceScoring:
    """Tests statistical confidence score calculation under calm vs noisy conditions."""

    def test_calm_vs_noisy_confidence(self):
        cal_data = {
            "tare_baseline": 0.0,
            "sensitivity": 0.02,
            "noise_floor_variance": 0.0001
        }

        # Calm reading: very low variance accelerometer readings
        calm_readings = generate_sensor_series(
            baseline=0.0,
            mass_g=5.0,
            sensitivity=0.02,
            std_dev=0.0001,
            count=30,
            seed=501
        )
        calm_result = weigh(calm_readings, calibration_data=cal_data)

        # Noisy reading: heavy environmental vibrations/shaking
        noisy_readings = generate_sensor_series(
            baseline=0.0,
            mass_g=5.0,
            sensitivity=0.02,
            std_dev=0.015,  # 150x more noisy in sensor units (0.75g variance)
            count=30,
            seed=502
        )
        noisy_result = weigh(noisy_readings, calibration_data=cal_data)

        assert calm_result["confidence"] >= 0.85
        assert noisy_result["confidence"] < 0.50
        assert calm_result["confidence"] > noisy_result["confidence"]
        assert calm_result["stable"] is True
        assert noisy_result["stable"] is False


class TestSettlingDetection:
    """Tests settling stabilization detection (transient motion vs settled equilibrium)."""

    def test_settling_stabilization(self):
        scale = PhoneScale(stabilization_tolerance=0.025)

        # Transient/unsettled series: placing weight on phone causes oscillation
        oscillating_readings = [1.0, 3.5, 4.2, 5.8, 4.4, 5.3, 4.7]
        is_stable, var, settled_count = scale.detect_settling(oscillating_readings)
        assert is_stable is False
        assert settled_count < 4

        # Settled equilibrium series: readings stabilized around 5.0g
        settled_readings = oscillating_readings + [5.01, 4.99, 5.00, 5.01, 5.00, 5.00]
        is_stable_settled, var_settled, settled_count_settled = scale.detect_settling(settled_readings)
        assert is_stable_settled is True
        assert var_settled < 0.025 ** 2
        assert settled_count_settled >= 5


class TestTiltCompensation:
    """Tests 3D gravity vector tilt compensation."""

    def test_tilt_compensation_accuracy(self):
        calibrator = PhoneScaleCalibrator()
        pitch_deg = 8.0
        roll_deg = 5.0
        cos_factor = math.cos(math.radians(pitch_deg)) * math.cos(math.radians(roll_deg))

        # True deflection for 5g at sensitivity 0.02
        true_deflection = 5.0 * 0.02
        # Tilted phone experiences attenuated gravity normal to surface
        tilted_raw_reading = true_deflection * cos_factor

        compensated = compensate_tilt(tilted_raw_reading, pitch_deg=pitch_deg, roll_deg=roll_deg)
        assert abs(compensated - true_deflection) < 1e-4

        # Full weighing with tilt compensation
        cal_data = {
            "tare_baseline": 0.0,
            "sensitivity": 0.02,
            "tilt_compensation": {
                "pitch_deg": pitch_deg,
                "roll_deg": roll_deg
            }
        }
        readings = [tilted_raw_reading] * 20
        result = weigh(readings, calibration_data=cal_data, pitch_deg=pitch_deg, roll_deg=roll_deg)
        assert abs(result["weight"] - 5.0) <= 0.09
        assert result["weight"] == 5.0


class TestEdgeCasesAndContracts:
    """Tests edge cases, contract compatibility, and absence of Twilio dependencies."""

    def test_empty_readings(self):
        res = weigh([])
        assert res["weight"] == 0.0
        assert res["weight_grams"] == 0.0
        assert res["confidence"] == 0.0
        assert res["stable"] is False

    def test_automatic_zero_tracking(self):
        # Tiny residual reading under AZT band (0.015 g) should zero out
        res = weigh([0.012] * 10)
        assert res["weight"] == 0.0

    def test_weigh_object_alias(self):
        res = weigh_object([5.0] * 15)
        assert "weight_grams" in res
        assert "confidence" in res
        assert "stable" in res
        assert res["weight_grams"] == 5.0

    def test_zero_twilio_imports(self):
        """Strict verification that no Twilio imports or telephony references exist."""
        import ast

        for module_name in ["phone_calibrator.py", "phone_weighing.py"]:
            file_path = current_dir / module_name
            assert file_path.exists(), f"File {file_path} missing"
            source = file_path.read_text(encoding="utf-8")

            # Check raw source text for forbidden twilio references
            assert "twilio" not in source.lower(), f"Forbidden 'twilio' reference in {module_name}"
            assert "telephony" not in source.lower(), f"Forbidden 'telephony' reference in {module_name}"

            # Check AST imports
            tree = ast.parse(source)
            for node in ast.walk(tree):
                if isinstance(node, ast.Import):
                    for alias in node.names:
                        assert "twilio" not in alias.name.lower(), f"Twilio import in {module_name}"
                elif isinstance(node, ast.ImportFrom):
                    mod = node.module or ""
                    assert "twilio" not in mod.lower(), f"Twilio importFrom in {module_name}"
