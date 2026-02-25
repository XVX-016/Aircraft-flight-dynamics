from __future__ import annotations

from adcs_core import api


def test_public_api_surface_is_frozen() -> None:
    expected = {
        "ActuatorLimits",
        "ActuatorState",
        "AirspeedSensor",
        "AircraftParameters",
        "Altimeter",
        "Autopilot",
        "AutopilotTargets",
        "Compass",
        "ControlIndex",
        "ControlInputs",
        "FailureManager",
        "IMU",
        "LongitudinalLqrDesign",
        "ModalAnalysisResult",
        "State",
        "StateIndex",
        "TrimResult",
        "analyze_modal_structure",
        "compute_level_trim",
        "compute_lqr_longitudinal",
        "compute_modal_analysis",
        "compute_trim",
        "design_longitudinal_lqr",
        "derivatives_6dof",
        "forces_and_moments_body",
        "get_aircraft_model",
        "linearize",
        "post_step_sanitize",
        "rk4_step",
        "rotation_body_to_inertial",
        "xdot_full",
        "WindModel",
    }
    assert set(api.__all__) == expected
