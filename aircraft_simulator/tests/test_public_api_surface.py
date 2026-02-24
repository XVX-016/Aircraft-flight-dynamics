from __future__ import annotations

from adcs_core import api


def test_public_api_surface_is_frozen() -> None:
    expected = {
        "ControlIndex",
        "LongitudinalLqrDesign",
        "ModalAnalysisResult",
        "StateIndex",
        "TrimResult",
        "analyze_modal_structure",
        "compute_level_trim",
        "compute_lqr_longitudinal",
        "compute_modal_analysis",
        "compute_trim",
        "design_longitudinal_lqr",
        "linearize",
        "rk4_step",
        "xdot_full",
    }
    assert set(api.__all__) == expected
