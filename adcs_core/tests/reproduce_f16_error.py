
import sys
import os
import numpy as np
import traceback

# Add the project root to sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..")))

from adcs_core.aircraft.database import get_aircraft_model
from adcs_core.analysis.trim import compute_level_trim
from adcs_core.analysis.lqr_longitudinal import design_longitudinal_lqr, extract_longitudinal_subsystem
from adcs_core.analysis.lqr_lateral import design_lateral_lqr, extract_lateral_subsystem
from adcs_core.dynamics.linearize import linearize
from adcs_core.model import xdot_full
from adcs_core.aircraft.aerodynamics import ControlInputs
from adcs_core.state import State
from adcs_core.dynamics.integrator import rk4_step

def run_test():
    print("=== F-16 Stability & Control Validation Script ===")
    
    # 1. Load Model
    print("\n[1/5] Loading F-16 Research Model...")
    try:
        model = get_aircraft_model("f16_research")
        print(f"PASS: Loaded {model.name}")
    except Exception as e:
        print(f"FAIL: {e}")
        return

    # 2. Trim
    V = 150.0
    Alt = 3000.0
    print(f"\n[2/5] Trimming at {V} m/s, {Alt} m altitude (Category: relaxed)...")
    try:
        trim = compute_level_trim(V, model.params, limits=model.limits, aircraft_category="relaxed")
        print(f"PASS: Trim converged. Residual: {trim.residual_norm:.2e}")
        print(f"      Alpha: {np.degrees(trim.alpha):.2f} deg")
        print(f"      Elevator: {np.degrees(trim.elevator):.2f} deg")
        print(f"      Throttle: {trim.throttle:.2f}")
    except Exception as e:
        print(f"FAIL: {e}")
        traceback.print_exc()
        return

    # 3. Linearization & Eigenvalues
    print("\n[3/5] Linearizing at trim point...")
    try:
        def f_sim(x, u_vec):
            ctrl = ControlInputs(throttle=u_vec[0], aileron=u_vec[1], elevator=u_vec[2], rudder=u_vec[3])
            return xdot_full(x, ctrl, params=model.params, limits=model.limits)
        
        A_full, B_full = linearize(f_sim, trim.x0, trim.u0)
        A_lon, _ = extract_longitudinal_subsystem(A_full, B_full)
        eigs = np.linalg.eigvals(A_lon)
        unstable = eigs[np.real(eigs) > 0]
        
        print(f"PASS: Linearization complete.")
        print(f"      Longitudinal Eigens: {eigs}")
        if len(unstable) > 0:
            print(f"      Confirmed unstable mode: {unstable[0]:.3f}")
        else:
            print("      WARNING: No unstable mode detected (expected for relaxed stability F-16)")
    except Exception as e:
        print(f"FAIL: {e}")
        return

    # 4. LQR Design
    print("\n[4/5] Designing LQR (Solving Riccati Equation)...")
    try:
        design_lon = design_longitudinal_lqr(A_full, B_full)
        design_lat = design_lateral_lqr(A_full, B_full)
        
        print("PASS: solve_continuous_are converged for both subsystems.")
        print(f"      K_lon norm: {np.linalg.norm(design_lon.K):.2f}")
        print(f"      K_lat norm: {np.linalg.norm(design_lat.K):.2f}")
        print(f"      Closed-loop max real eig: {design_lon.max_real_closed:.3f}")
    except Exception as e:
        print(f"FAIL: {e}")
        traceback.print_exc()
        return

    # 5. Stability Simulation
    print("\n[5/5] Simulating 100 steps with LQR active...")
    try:
        dt = 0.02
        state_vec = trim.x0.copy()
        # Add a small pitch perturbation
        state_vec[10] += 0.05 # q perturbation
        
        K_lon = design_lon.K
        K_lat = design_lat.K
        
        from adcs_core.analysis.lqr_longitudinal import LONGITUDINAL_STATE_IDX_FULL
        from adcs_core.analysis.lqr_lateral import LATERAL_STATE_IDX_FULL
        
        x_trim = trim.x0
        u_trim = trim.u0
        
        for _ in range(100):
            x_lon = state_vec[LONGITUDINAL_STATE_IDX_FULL]
            x_lat = state_vec[LATERAL_STATE_IDX_FULL]
            
            du_lon = -K_lon @ (x_lon - x_trim[LONGITUDINAL_STATE_IDX_FULL])
            du_lat = -K_lat @ (x_lat - x_trim[LATERAL_STATE_IDX_FULL])
            
            u_vec = u_trim.copy()
            u_vec[2] += du_lon[0] # elevator
            u_vec[0] += du_lon[1] # throttle
            u_vec[1] += du_lat[0] # aileron
            u_vec[3] += du_lat[1] # rudder
            
            def f_dyn(t, x):
                ctrl = ControlInputs(throttle=u_vec[0], aileron=u_vec[1], elevator=u_vec[2], rudder=u_vec[3])
                return xdot_full(x, ctrl, params=model.params, limits=model.limits)
            
            state_vec = rk4_step(f_dyn, 0, state_vec, dt)
            
        # Use a more targeted deviation check: ignore inertial X/Y/Z position 
        # Focus on [u, v, w, phi, theta, psi, p, q, r]
        dynamic_indices = list(range(3, 12))
        deviation = np.linalg.norm(state_vec[dynamic_indices] - x_trim[dynamic_indices])
        print(f"PASS: Simulation complete. Final dynamic deviation from trim: {deviation:.2e}")
        
        if deviation < 0.2:
            print("\nRESULT: ALL STEPS PASSED. F-16 MODEL PIPELINE IS VALID.")
        else:
            print(f"\nRESULT: STABILITY MARGIN LOW (dev={deviation:.2f}). Check tuning.")
            
    except Exception as e:
        print(f"FAIL in simulation: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    run_test()
