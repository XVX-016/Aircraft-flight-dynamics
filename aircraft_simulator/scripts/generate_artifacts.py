from __future__ import annotations

import argparse
import os
import sys
from dataclasses import asdict

import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# Allow running as: python aircraft_simulator/scripts/generate_artifacts.py
_HERE = os.path.dirname(__file__)
_ROOT = os.path.abspath(os.path.join(_HERE, "..", ".."))
if _ROOT not in sys.path:
    sys.path.insert(0, _ROOT)

from adcs_core.api import (  # noqa: E402
    ControlIndex,
    ControlInputs,
    StateIndex,
    analyze_modal_structure,
    compute_level_trim,
    design_longitudinal_lqr,
    get_aircraft_model,
    linearize,
    rk4_step,
    xdot_full,
)


def _linearize_at_trim(aircraft_id: str, speed_mps: float) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, object]:
    model = get_aircraft_model(aircraft_id)
    trim = compute_level_trim(speed_mps, model.params, limits=model.limits)

    def f(x: np.ndarray, u_vec: np.ndarray) -> np.ndarray:
        ctrl = ControlInputs(
            throttle=float(u_vec[int(ControlIndex.THROTTLE)]),
            aileron=float(u_vec[int(ControlIndex.AILERON)]),
            elevator=float(u_vec[int(ControlIndex.ELEVATOR)]),
            rudder=float(u_vec[int(ControlIndex.RUDDER)]),
        )
        return xdot_full(x, ctrl, params=model.params, limits=model.limits)

    A, B = linearize(f, trim.x0, trim.u0)
    return A, B, np.asarray(trim.x0, dtype=float), np.asarray(trim.u0, dtype=float), model


def _apply_alpha_perturbation(x_trim: np.ndarray, alpha_perturb_deg: float) -> np.ndarray:
    x0 = np.asarray(x_trim, dtype=float).copy()
    alpha0 = float(np.arctan2(x0[int(StateIndex.W)], x0[int(StateIndex.U)]))
    vmag = float(np.hypot(x0[int(StateIndex.U)], x0[int(StateIndex.W)]))
    alpha1 = alpha0 + np.deg2rad(alpha_perturb_deg)
    x0[int(StateIndex.U)] = vmag * np.cos(alpha1)
    x0[int(StateIndex.W)] = vmag * np.sin(alpha1)
    return x0


def _simulate_response(
    *,
    model,
    x_trim: np.ndarray,
    u_trim: np.ndarray,
    K: np.ndarray | None,
    tfinal_s: float,
    dt_s: float,
    alpha_perturb_deg: float,
) -> dict[str, np.ndarray]:
    t = np.arange(0.0, tfinal_s + 0.5 * dt_s, dt_s)
    x = _apply_alpha_perturbation(x_trim, alpha_perturb_deg=alpha_perturb_deg)

    idx_lon = np.array(
        [
            int(StateIndex.U),
            int(StateIndex.W),
            int(StateIndex.Q),
            int(StateIndex.THETA),
        ],
        dtype=int,
    )

    x_hist = np.zeros((t.size, 12), dtype=float)
    err_hist = np.zeros(t.size, dtype=float)
    de_hist = np.zeros(t.size, dtype=float)
    thr_hist = np.zeros(t.size, dtype=float)

    def f_dyn(tt: float, xx: np.ndarray) -> np.ndarray:
        if K is None:
            de = float(u_trim[int(ControlIndex.ELEVATOR)])
            thr = float(u_trim[int(ControlIndex.THROTTLE)])
        else:
            x_sub = xx[idx_lon]
            x_ref = x_trim[idx_lon]
            du = -K @ (x_sub - x_ref)
            de = float(
                np.clip(
                    u_trim[int(ControlIndex.ELEVATOR)] + float(du[0]),
                    -model.limits.elevator_max_rad,
                    model.limits.elevator_max_rad,
                )
            )
            thr = float(np.clip(u_trim[int(ControlIndex.THROTTLE)] + float(du[1]), 0.0, 1.0))

        ctrl = ControlInputs(throttle=thr, aileron=0.0, elevator=de, rudder=0.0)
        return xdot_full(xx, ctrl, params=model.params, limits=model.limits)

    for i, tt in enumerate(t):
        x_hist[i] = x
        err_hist[i] = float(np.linalg.norm(x[idx_lon] - x_trim[idx_lon]))
        if K is None:
            de_hist[i] = float(u_trim[int(ControlIndex.ELEVATOR)])
            thr_hist[i] = float(u_trim[int(ControlIndex.THROTTLE)])
        else:
            x_sub = x[idx_lon]
            x_ref = x_trim[idx_lon]
            du = -K @ (x_sub - x_ref)
            de_hist[i] = float(
                np.clip(
                    u_trim[int(ControlIndex.ELEVATOR)] + float(du[0]),
                    -model.limits.elevator_max_rad,
                    model.limits.elevator_max_rad,
                )
            )
            thr_hist[i] = float(np.clip(u_trim[int(ControlIndex.THROTTLE)] + float(du[1]), 0.0, 1.0))

        if i < t.size - 1:
            x = rk4_step(f_dyn, float(tt), x, dt_s)

    return {
        "t": t,
        "x": x_hist,
        "err": err_hist,
        "de": de_hist,
        "thr": thr_hist,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description="Generate report-ready control artifacts (trim-first pipeline).")
    parser.add_argument("--aircraft-id", default="cessna_172r")
    parser.add_argument("--speed-mps", type=float, default=60.0)
    parser.add_argument("--outdir", default="aircraft_simulator/plots/phase_report")
    parser.add_argument("--tfinal-s", type=float, default=8.0)
    parser.add_argument("--dt-s", type=float, default=0.01)
    parser.add_argument("--alpha-perturb-deg", type=float, default=0.5)
    args = parser.parse_args()

    os.makedirs(args.outdir, exist_ok=True)

    A, B, x_trim, u_trim, model = _linearize_at_trim(args.aircraft_id, args.speed_mps)
    eig_open = np.linalg.eigvals(A)
    modal = analyze_modal_structure(A)
    lqr_design = design_longitudinal_lqr(A, B)
    eig_closed_lon = lqr_design.closed_loop_eigenvalues

    open_sim = _simulate_response(
        model=model,
        x_trim=x_trim,
        u_trim=u_trim,
        K=None,
        tfinal_s=args.tfinal_s,
        dt_s=args.dt_s,
        alpha_perturb_deg=args.alpha_perturb_deg,
    )
    closed_sim = _simulate_response(
        model=model,
        x_trim=x_trim,
        u_trim=u_trim,
        K=np.asarray(lqr_design.K, dtype=float),
        tfinal_s=args.tfinal_s,
        dt_s=args.dt_s,
        alpha_perturb_deg=args.alpha_perturb_deg,
    )

    # Plots
    plt.figure(figsize=(6, 5))
    plt.scatter(eig_open.real, eig_open.imag, s=18, label="open-loop")
    plt.axvline(0.0, color="k", linewidth=1, alpha=0.35)
    plt.grid(True, alpha=0.25)
    plt.xlabel("Re")
    plt.ylabel("Im")
    plt.title("Open-Loop Eigenvalues (Full Linearized System)")
    plt.tight_layout()
    plt.savefig(os.path.join(args.outdir, "eigs_open_loop.png"), dpi=150)
    plt.close()

    plt.figure(figsize=(6, 5))
    plt.scatter(eig_closed_lon.real, eig_closed_lon.imag, s=18, label="closed-loop longitudinal")
    plt.axvline(0.0, color="k", linewidth=1, alpha=0.35)
    plt.grid(True, alpha=0.25)
    plt.xlabel("Re")
    plt.ylabel("Im")
    plt.title("Closed-Loop Eigenvalues (Longitudinal LQR)")
    plt.tight_layout()
    plt.savefig(os.path.join(args.outdir, "eigs_lqr_longitudinal.png"), dpi=150)
    plt.close()

    plt.figure(figsize=(9, 4))
    plt.plot(open_sim["t"], open_sim["err"], label="open-loop error norm")
    plt.plot(closed_sim["t"], closed_sim["err"], label="closed-loop error norm")
    plt.grid(True, alpha=0.25)
    plt.xlabel("t [s]")
    plt.ylabel("||x_lon - x_trim||")
    plt.title("Longitudinal Perturbation Recovery")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(args.outdir, "response_error_open_closed.png"), dpi=150)
    plt.close()

    plt.figure(figsize=(9, 4))
    plt.plot(open_sim["t"], open_sim["x"][:, int(StateIndex.Q)], label="open-loop q")
    plt.plot(closed_sim["t"], closed_sim["x"][:, int(StateIndex.Q)], label="closed-loop q")
    plt.grid(True, alpha=0.25)
    plt.xlabel("t [s]")
    plt.ylabel("q [rad/s]")
    plt.title("Pitch Rate Response")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(args.outdir, "response_q_open_closed.png"), dpi=150)
    plt.close()

    plt.figure(figsize=(9, 4))
    plt.plot(closed_sim["t"], np.rad2deg(closed_sim["de"]), label="elevator [deg]")
    plt.plot(closed_sim["t"], closed_sim["thr"] * 100.0, label="throttle [%]")
    plt.grid(True, alpha=0.25)
    plt.xlabel("t [s]")
    plt.ylabel("Control effort")
    plt.title("Closed-Loop Control Effort")
    plt.legend()
    plt.tight_layout()
    plt.savefig(os.path.join(args.outdir, "control_effort_closed.png"), dpi=150)
    plt.close()

    # Data outputs
    trim_df = pd.DataFrame(
        [
            {
                "aircraft_id": args.aircraft_id,
                "speed_mps": args.speed_mps,
                "alpha_rad": float(np.arctan2(x_trim[int(StateIndex.W)], x_trim[int(StateIndex.U)])),
                "theta_rad": float(x_trim[int(StateIndex.THETA)]),
                "throttle": float(u_trim[int(ControlIndex.THROTTLE)]),
                "elevator_rad": float(u_trim[int(ControlIndex.ELEVATOR)]),
                "u_mps": float(x_trim[int(StateIndex.U)]),
                "w_mps": float(x_trim[int(StateIndex.W)]),
            }
        ]
    )
    trim_df.to_csv(os.path.join(args.outdir, "trim_summary.csv"), index=False)

    pd.DataFrame(
        [{"real": float(ev.real), "imag": float(ev.imag)} for ev in eig_open]
    ).to_csv(os.path.join(args.outdir, "eigenvalues_open_loop.csv"), index=False)
    pd.DataFrame(
        [{"real": float(ev.real), "imag": float(ev.imag)} for ev in eig_closed_lon]
    ).to_csv(os.path.join(args.outdir, "eigenvalues_closed_loop_longitudinal.csv"), index=False)

    modal_df = pd.DataFrame([asdict(m) for m in modal.modes])
    modal_df.to_csv(os.path.join(args.outdir, "modal_summary.csv"), index=False)

    pd.DataFrame(np.asarray(lqr_design.K, dtype=float)).to_csv(
        os.path.join(args.outdir, "lqr_gain_matrix.csv"), index=False, header=False
    )

    response_df = pd.DataFrame(
        [
            {
                "scenario": "open_loop",
                "peak_q_radps": float(np.max(np.abs(open_sim["x"][:, int(StateIndex.Q)]))),
                "final_error_norm": float(open_sim["err"][-1]),
            },
            {
                "scenario": "closed_loop",
                "peak_q_radps": float(np.max(np.abs(closed_sim["x"][:, int(StateIndex.Q)]))),
                "final_error_norm": float(closed_sim["err"][-1]),
            },
        ]
    )
    response_df.to_csv(os.path.join(args.outdir, "response_metrics.csv"), index=False)

    print(f"Artifacts written to: {args.outdir}")


if __name__ == "__main__":
    main()
