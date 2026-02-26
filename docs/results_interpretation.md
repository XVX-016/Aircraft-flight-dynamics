# Results Interpretation Guide

## Purpose
This guide explains how to interpret generated analysis artifacts for lab reports
and portfolio narratives without overstating conclusions.

## Artifact Sources
- `aircraft_simulator/scripts/generate_artifacts.py`
- `aircraft_simulator/scripts/plot_log.py`
- analysis outputs produced by tests under `aircraft_simulator/tests`

Typical output files (under `plots/` unless overridden):
- `eigs_open_loop.png`
- `eigs_lqr_longitudinal.png`
- `altitude_step_response.png`
- `metrics.txt`

## 1) Open-Loop Eigenvalue Plot (`eigs_open_loop.png`)

### What it shows
- Eigenvalues of the linearized full-state model around an operating condition.
- X-axis: real part (stability margin direction)
- Y-axis: imaginary part (oscillation frequency content)

### How to interpret
- Points with `Re(lambda) < 0`: locally stable modes
- Points with `Re(lambda) > 0`: locally unstable modes
- Complex conjugate pairs indicate oscillatory modes

### What you can claim
- Local open-loop stability characterization at the chosen operating point.

### What you cannot claim
- Global nonlinear stability.
- Stability for all flight conditions.

## 2) Closed-Loop Longitudinal Eigenvalue Plot (`eigs_lqr_longitudinal.png`)

### What it shows
- Eigenvalues of longitudinal closed-loop subsystem after LQR design.
- Usually based on reduced state `[u, w, q, theta]` and selected inputs.

### How to interpret
- Left shift vs open-loop indicates improved local damping/stability.
- Dominant mode closer to zero implies slower settling.
- More negative dominant real part generally implies faster decay.

### What to report
- `max Re(lambda_open)` vs `max Re(lambda_closed)`
- qualitative damping change
- whether unstable open-loop mode became stable

## 3) Altitude Step Response (`altitude_step_response.png`)

### What it shows
- Nonlinear simulation response of altitude tracking to a step target change.
- Dashed line: commanded altitude
- Solid line: truth altitude

### Metrics file (`metrics.txt`)
Typical fields:
- `overshoot_frac`
- `rise_time_s`
- `settling_time_s`

### How to interpret
- Lower overshoot and shorter settling time indicate tighter regulation.
- Report trade-off with control effort when available.

### Good reporting pattern
- Compare open-loop vs closed-loop for the same disturbance.
- Keep wind/seed/dt fixed across comparisons.

## 4) Modal and Robustness Data (Phase 5/6 style outputs)

If you generated modal fidelity/robustness outputs (frequency and damping errors):
- frequency error primarily reflects stiffness/restoring-term fidelity
- damping error is often more sensitive to model structure and coupling
- dt refinement plateaus indicate numerical convergence

Use this distinction explicitly:
- **numerical convergence** (integration/test stability)
- **model fidelity** (linear-vs-nonlinear agreement)

## 5) Recommended Report Claims

Safe claims:
- Trim, linearization, modal extraction, and LQR pipeline is implemented.
- Open-loop/closed-loop local stability shift is observable.
- Determinism and architecture boundaries are enforced by tests.

Avoid over-claims:
- “Globally stable aircraft model”
- “Controller robust for all uncertainties”
- “Publication-grade validation complete” (unless uncertainty/sensitivity is demonstrated)

## 6) Minimum Figure Set for Strong Lab Report
- Open-loop eigenvalue plot
- Closed-loop eigenvalue plot
- Time-domain response plot (disturbance or step)
- One table: key metrics (overshoot, settling time, dominant eigenvalue)

## 7) Reproducibility Notes for Figures
- Pin scenario parameters: seed, dt, horizon, perturbation amplitude.
- Keep same trim operating point across compared runs.
- Save raw CSV/log with every figure.
- Use the same extraction method for all compared curves.
