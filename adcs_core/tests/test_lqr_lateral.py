from __future__ import annotations

import numpy as np
import pytest
from adcs_core.analysis.lqr_lateral import LateralLqrDesigner, design_lateral_lqr, extract_lateral_subsystem


def get_unstable_lateral_system():
    # Synthetic lateral-directional system
    # States: [v, p, r, phi]
    A_lat = np.array([
        [-0.1,  0.0, -10.0,  9.8],
        [-0.5, -2.0,   0.5,  0.0],
        [ 0.1, -0.1,  -0.2,  0.0],
        [ 0.0,  1.0,   0.0,  0.0]
    ])
    
    # Add a slightly unstable spiral mode (positive real part)
    # The spiral mode is usually the smallest magnitude eigenvalue.
    # We'll nudge the A matrix to ensure instability.
    A_lat[2, 0] = 0.2  # Increase yaw-sideslip coupling
    
    # Inputs: [delta_a, delta_r]
    B_lat = np.array([
        [0.0,  2.0],
        [10.0, 1.0],
        [1.0, -5.0],
        [0.0,  0.0]
    ])
    return A_lat, B_lat


def test_gain_matrix_shape():
    A_lat, B_lat = get_unstable_lateral_system()
    designer = LateralLqrDesigner(A_lat, B_lat)
    design = designer.design()
    # K should be (num_inputs, num_states) = (2, 4)
    assert design.K.shape == (2, 4)


def test_closed_loop_stable():
    A_lat, B_lat = get_unstable_lateral_system()
    
    # Verify open loop is unstable
    eig_open = np.linalg.eigvals(A_lat)
    assert np.any(np.real(eig_open) > 0.0)
    
    designer = LateralLqrDesigner(A_lat, B_lat)
    design = designer.design()
    
    # Verify closed loop is stable
    eig_closed, is_stable = designer.check_stability(A_lat, B_lat, design.K)
    assert is_stable
    assert np.all(np.real(eig_closed) < 0.0)


def test_custom_weights():
    A_lat, B_lat = get_unstable_lateral_system()
    designer = LateralLqrDesigner(A_lat, B_lat)
    
    # Default design
    design_def = designer.design()
    
    # High phi penalty
    Q_high_phi = np.diag([1.0, 10.0, 10.0, 500.0])
    design_high = designer.design(Q=Q_high_phi)
    
    # K matrix is 2x4. Index [:, 3] corresponds to phi.
    # Higher penalty should result in higher gains in magnitude to suppress error.
    gain_def = np.linalg.norm(design_def.K[:, 3])
    gain_high = np.linalg.norm(design_high.K[:, 3])
    
    assert gain_high > gain_def


def test_spiral_mode_damped():
    # Simulate first-order recovery
    A_lat, B_lat = get_unstable_lateral_system()
    designer = LateralLqrDesigner(A_lat, B_lat)
    design = designer.design()
    K = design.K
    
    # Initial state: 15 degrees bank (0.262 rad), others zero
    x = np.array([0.0, 0.0, 0.0, 0.262])
    
    dt = 0.02
    steps = 50
    phi_history = []
    
    for _ in range(steps):
        phi_history.append(abs(x[3]))
        # LQR control: u = -K * x
        u = -K @ x
        # x_dot = A*x + B*u
        x_dot = A_lat @ x + B_lat @ u
        # Euler integration for simple check
        x = x + x_dot * dt
        
    # Verify phi is converging (final error < initial error)
    assert phi_history[-1] < phi_history[0]
    # Check for significant reduction
    assert phi_history[-1] < 0.1 * phi_history[0]
