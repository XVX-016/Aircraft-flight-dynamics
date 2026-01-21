from __future__ import annotations

import argparse
import csv
import os
from dataclasses import asdict
from datetime import datetime
from typing import Dict, Tuple

import numpy as np

from sim.aircraft.aerodynamics import ControlInputs
from sim.aircraft.forces_moments import ActuatorLimits, forces_and_moments_body
from sim.aircraft.parameters import AircraftParameters
from sim.control.actuators import ActuatorState
from sim.control.autopilot import Autopilot, AutopilotTargets
from sim.dynamics.equations import derivatives_6dof, post_step_sanitize
from sim.dynamics.integrator import rk4_step
from sim.state import State, airspeed


def sensors_from_state(s: State) -> Dict[str, float]:
    return {
        "airspeed_mps": airspeed(s),
        "altitude_m": -float(s.z),  # NED: z is down
        "heading_rad": float(s.psi),
        "phi_rad": float(s.phi),
        "theta_rad": float(s.theta),
        "p_radps": float(s.p),
        "q_radps": float(s.q),
        "r_radps": float(s.r),
    }


def default_initial_state() -> State:
    # Level-ish flight with initial down position matching altitude ~1000 m
    return State(x=0.0, y=0.0, z=-1000.0, u=35.0, v=0.0, w=0.0, phi=0.0, theta=0.0, psi=0.0, p=0.0, q=0.0, r=0.0)


def run(
    tfinal: float,
    dt: float,
    autopilot_enabled: bool,
    targets: AutopilotTargets,
    actuator_tau: float,
) -> Tuple[str, int]:
    params = AircraftParameters()
    limits = ActuatorLimits()

    s = default_initial_state()
    x = s.as_vector()
    t = 0.0

    ap = Autopilot()
    act = ActuatorState(tau_s=actuator_tau, limits=limits)
    act.reset(ControlInputs(throttle=0.5))

    u_cmd = ControlInputs(throttle=0.5)

    os.makedirs("logs", exist_ok=True)
    ts = datetime.now().strftime("%Y%m%d_%H%M%S")
    out_path = os.path.join("logs", f"sim_{ts}.csv")

    header_written = False
    steps = int(np.ceil(tfinal / dt))

    with open(out_path, "w", newline="", encoding="utf8") as f:
        writer = csv.DictWriter(f, fieldnames=[])

        for k in range(steps + 1):
            s = State.from_vector(x)
            sens = sensors_from_state(s)

            ap_debug = {}
            if autopilot_enabled:
                u_cmd, ap_debug = ap.update(sens, targets, dt)

            u = act.update(u_cmd, dt)

            F_b, M_b, fm_debug = forces_and_moments_body(s, u, params, limits)

            def f_dyn(ti: float, xi: np.ndarray) -> np.ndarray:
                si = State.from_vector(xi)
                F, M, _ = forces_and_moments_body(si, u, params, limits)
                return derivatives_6dof(ti, xi, params, F, M)

            # log
            row = {"t": t, **s.as_dict(), **sens}
            row.update({f"u_cmd_{k}": v for k, v in asdict(u_cmd).items()})
            row.update({f"u_{k}": v for k, v in asdict(u).items()})
            row.update({f"ap_{k}": v for k, v in ap_debug.items()})
            row.update({f"fm_{k}": v for k, v in fm_debug.items()})

            if not header_written:
                writer.fieldnames = list(row.keys())
                writer.writeheader()
                header_written = True

            writer.writerow(row)

            # integrate
            x = rk4_step(f_dyn, t, x, dt)
            x = post_step_sanitize(x)
            t += dt

    return out_path, steps


def main() -> None:
    p = argparse.ArgumentParser(description="6-DOF aircraft simulator (Phase 2: aero + PID autopilot)")
    p.add_argument("--tfinal", type=float, default=20.0)
    p.add_argument("--dt", type=float, default=0.01)
    p.add_argument("--autopilot", action="store_true", help="enable PID autopilot")
    p.add_argument("--V", type=float, default=35.0, help="target airspeed [m/s]")
    p.add_argument("--alt", type=float, default=1000.0, help="target altitude [m]")
    p.add_argument("--hdg", type=float, default=0.0, help="target heading [deg]")
    p.add_argument("--act_tau", type=float, default=0.15, help="actuator time constant [s]")
    args = p.parse_args()

    targets = AutopilotTargets(airspeed_mps=args.V, altitude_m=args.alt, heading_rad=np.deg2rad(args.hdg))
    out_path, steps = run(args.tfinal, args.dt, args.autopilot, targets, args.act_tau)
    print(f"Wrote {steps} steps to {out_path}")


if __name__ == "__main__":
    main()


