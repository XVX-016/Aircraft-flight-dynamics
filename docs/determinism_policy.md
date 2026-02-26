# Determinism and Reproducibility Policy

## Purpose
This document defines what is expected to remain deterministic for `adcs_core`
and how reproducibility is validated.

## Baseline Environment
- Python: `3.11`
- Core libraries installed from `requirements.txt`
- Test runner: `pytest`

## Deterministic Controls
- Fixed-step RK4 integration (`rk4_step`) is used for validation paths.
- Trim solver tolerances are explicitly set in code.
- Jacobian finite-difference tolerances are explicitly set in code.
- Modal/robustness tests use fixed seeds where stochastic elements are present.

## Invariant Gates
The following tests are treated as reproducibility gates and must stay green:
- `aircraft_simulator/tests/test_baseline_invariants.py`
- `aircraft_simulator/tests/test_public_api_surface.py`
- `aircraft_simulator/tests/test_architecture_boundaries.py`
- `aircraft_simulator/tests/test_external_api_import_boundary.py`

## Accepted Numerical Behavior
- Minor floating-point variation across OS/BLAS builds is possible.
- Golden baseline tolerances in tests are the contract. Do not relax tolerances
  without documenting the reason and linking the physics or solver change.

## Change Control Rules
If any of the invariant gates fail:
1. Stop and identify the source (state ordering, solver change, import boundary, or API drift).
2. Fix the regression first.
3. Regenerate golden baselines only when the underlying physics/modeling intent changed.

## CI Enforcement
CI runs on:
- `ubuntu-latest`, Python `3.11`
- `windows-latest`, Python `3.11`

Both targets run `python -m pytest -q` and must pass before merge.
