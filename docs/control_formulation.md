# Control Formulation

## Scope
This document defines the control-relevant math and implementation contracts for `adcs_core`.
It is the canonical reference for state ordering, nonlinear dynamics, trim, linearization, and longitudinal LQR design.

## State, Control, and Frames

### Full nonlinear state vector
`x = [x, y, z, u, v, w, phi, theta, psi, p, q, r]^T`

- Position `x,y,z`: inertial frame (NED convention used by simulator sign conventions)
- Body translational velocities `u,v,w`: body frame
- Euler angles `phi,theta,psi`: roll, pitch, yaw
- Body angular rates `p,q,r`: body frame

Canonical indices are defined in `adcs_core/state/state_definition.py` via `StateIndex`.

### Control vector
`u_c = [throttle, aileron, elevator, rudder]^T`

Canonical indices are defined by `ControlIndex` in `adcs_core/state/state_definition.py`.

## Nonlinear Dynamics Model
Continuous-time rigid-body dynamics are evaluated by:

- `xdot_full(x, ControlInputs, params, limits, uvw_air_mps=None)` in `adcs_core/model.py`
- 6DOF derivative assembly in `adcs_core/dynamics/equations.py`
- Aerodynamic and thrust force/moment generation in `adcs_core/aircraft/forces_moments.py`

Numerical propagation uses fixed-step RK4:

- `rk4_step(...)` in `adcs_core/dynamics/integrator.py`

## Trim Formulation
Level-flight longitudinal trim is solved by nonlinear least squares in `adcs_core/analysis/trim.py`.

Unknowns:
`z = [alpha, theta, de, throttle]^T`

Residual:
`r(z) = [u_dot, w_dot, q_dot, theta - alpha]^T`

where `(u_dot, w_dot, q_dot)` are extracted from `xdot_full` evaluated at the reconstructed trim state/control.

Primary outputs:

- `x0` (trim state)
- `u0` (trim control)
- `residual_norm`
- `solver success + nfev`

## Linearization Method
Linearization is finite-difference based and implemented in `adcs_core/dynamics/linearize.py`.

Given nonlinear model `x_dot = f(x,u)` at `(x0,u0)`:

- `A = d f / d x |_(x0,u0)`
- `B = d f / d u |_(x0,u0)`

computed using central finite differences via `finite_difference_jacobian(...)`.

This method is validated by directional consistency tests (`test_jacobian_validation.py`) and baseline invariants.

## Dynamic Subsystem Used for Modal Analysis
For a full 12x12 linear model, dynamic-state submatrix extraction is:

`A_d = A[3:12, 3:12]`

Ordering in `A_d` is represented by `DynamicStateIndex` and used by modal routines in `adcs_core/analysis/modal_analysis.py`.

## Longitudinal LQR Formulation
Longitudinal reduced subsystem uses:

- State: `[u, w, q, theta]`
- Inputs: `[elevator, throttle]`

as defined in `LONGITUDINAL_STATE_IDX_FULL` and `LONGITUDINAL_INPUT_IDX_FULL` in `adcs_core/analysis/lqr_longitudinal.py`.

Continuous-time LQR solves:

`A^T P + P A - P B R^-1 B^T P + Q = 0`

`K = R^-1 B^T P`

with implementation in `design_longitudinal_lqr(...)`.

Default weights:

- `Q = diag([1, 10, 100, 50])`
- `R = diag([1, 0.5])`

Closed-loop dynamics:

`A_cl = A - B K`

## Assumptions and Envelope Notes
Current baseline assumptions for trim/analysis:

- Wings-level, coordinated, longitudinal-dominant trim setup
- Small perturbation neighborhood for linear fidelity comparisons
- Fixed-step integration for deterministic reproducibility tests
- Actuator limits enforced in nonlinear simulation where applicable

This document intentionally fixes formulation and ordering semantics for research reproducibility.
Any change to state/control ordering, trim residual definition, or LQR structure is a versioned interface change.