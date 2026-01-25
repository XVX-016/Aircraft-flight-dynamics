from __future__ import annotations

# Allow running as: python scripts\generate_artifacts.py from aircraft_simulator/
import os
import sys

_HERE = os.path.dirname(__file__)
_ROOT = os.path.abspath(os.path.join(_HERE, ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

import argparse
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

from sim.aircraft.aerodynamics import ControlInputs
from sim.control.linearize import linearize, select_subsystem
from sim.control.lqr import lqr
from sim.model import xdot_full
from sim.state import State
from sim.simulator import run
from sim.control.autopilot import AutopilotTargets
from sim.analysis.metrics import step_response_metrics


def main() -> None:
    p = argparse.ArgumentParser(description="Generate proof artifacts (plots + metrics) for portfolio.")
    p.add_argument("--outdir", default="plots", help="output directory for PNGs")
    p.add_argument("--seed", type=int, default=3)
    args = p.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    # --- Linearization around a reasonable operating point (not a full trim solver yet) ---
    s0 = State(x=0.0, y=0.0, z=-1000.0, u=35.0, v=0.0, w=0.0, phi=0.0, theta=0.0, psi=0.0, p=0.0, q=0.0, r=0.0)
    x0 = s0.as_vector()
    u0 = np.array([0.5, 0.0, 0.0, 0.0], dtype=float)  # [throttle, aileron, elevator, rudder]

    def f(x: np.ndarray, uvec: np.ndarray) -> np.ndarray:
        u = ControlInputs(throttle=float(uvec[0]), aileron=float(uvec[1]), elevator=float(uvec[2]), rudder=float(uvec[3]))
        return xdot_full(x, u)

    A, B = linearize(f, x0, u0, eps_x=1e-4, eps_u=1e-4)

    eigA = np.linalg.eigvals(A)
    plt.figure(figsize=(6, 5))
    plt.scatter(eigA.real, eigA.imag, s=16)
    plt.axvline(0, color="k", linewidth=1, alpha=0.4)
    plt.grid(True, alpha=0.25)
    plt.title("Open-loop eigenvalues (full 12-state linearization)")
    plt.xlabel("Re")
    plt.ylabel("Im")
    plt.tight_layout()
    plt.savefig(os.path.join(args.outdir, "eigs_open_loop.png"), dpi=150)
    plt.close()

    # --- Reduced longitudinal subsystem example: x=[u,w,q,theta], u=[elevator, throttle] ---
    # full state indices: [x,y,z,u,v,w,phi,theta,psi,p,q,r]
    idx_u = 3
    idx_w = 5
    idx_theta = 7
    idx_q = 10
    state_idx = [idx_u, idx_w, idx_q, idx_theta]
    # control indices into u0: [throttle, aileron, elevator, rudder]
    input_idx = [2, 0]  # elevator, throttle
    A_lon, B_lon = select_subsystem(A, B, state_idx=state_idx, input_idx=input_idx)

    # LQR weights (tunable); these produce a usable stabilizer for demo purposes
    Q = np.diag([2.0, 8.0, 10.0, 25.0])
    R = np.diag([2.0, 1.0])
    try:
        K, _, E = lqr(A_lon, B_lon, Q, R)
        plt.figure(figsize=(6, 5))
        plt.scatter(E.real, E.imag, s=20)
        plt.axvline(0, color="k", linewidth=1, alpha=0.4)
        plt.grid(True, alpha=0.25)
        plt.title("Closed-loop eigenvalues (longitudinal LQR demo)")
        plt.xlabel("Re")
        plt.ylabel("Im")
        plt.tight_layout()
        plt.savefig(os.path.join(args.outdir, "eigs_lqr_longitudinal.png"), dpi=150)
        plt.close()
    except RuntimeError:
        # python-control not installed; still generate open-loop artifacts
        K = None

    # --- Step response artifacts using the full nonlinear sim (truth logs + metrics) ---
    out_path, _ = run(
        tfinal=15.0,
        dt=0.02,
        autopilot_enabled=True,
        targets=AutopilotTargets(airspeed_mps=35.0, altitude_m=1100.0, heading_rad=0.0),
        actuator_tau=0.15,
        seed=args.seed,
        wind_ned_mps=(0.0, 0.0, 0.0),
    )
    df = pd.read_csv(out_path)

    m = step_response_metrics(df["t"], df["truth_altitude_m"], y_target=1100.0)
    metrics_path = os.path.join(args.outdir, "metrics.txt")
    with open(metrics_path, "w", encoding="utf8") as f:
        f.write("Altitude step metrics (truth_altitude_m -> 1100 m)\n")
        f.write(f"overshoot_frac: {m.overshoot_frac}\n")
        f.write(f"rise_time_s: {m.rise_time_s}\n")
        f.write(f"settling_time_s: {m.settling_time_s}\n")

    plt.figure(figsize=(9, 4))
    plt.plot(df["t"], df["truth_altitude_m"], label="truth altitude")
    plt.axhline(1100.0, color="k", linewidth=1, alpha=0.35, linestyle="--", label="target")
    plt.grid(True, alpha=0.25)
    plt.xlabel("t [s]")
    plt.ylabel("Altitude [m]")
    plt.title("Altitude step response (Phase 5 proof artifact)")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(args.outdir, "altitude_step_response.png"), dpi=150)
    plt.close()

    print(f"Wrote artifacts to {args.outdir} (and sim log: {out_path})")


if __name__ == "__main__":
    main()


