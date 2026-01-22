from __future__ import annotations

import argparse
import os
from dataclasses import asdict
from typing import Dict, Tuple

import numpy as np

from aircraft_simulator.sim.aircraft.aerodynamics import ControlInputs
from aircraft_simulator.sim.aircraft.forces_moments import ActuatorLimits, forces_and_moments_body
from aircraft_simulator.sim.aircraft.parameters import AircraftParameters
from aircraft_simulator.sim.control.failure_modes import FailureManager
from aircraft_simulator.sim.control.actuators import ActuatorState
from aircraft_simulator.sim.control.autopilot import Autopilot, AutopilotTargets
from aircraft_simulator.sim.dynamics.equations import derivatives_6dof, post_step_sanitize, rotation_body_to_inertial
from aircraft_simulator.sim.dynamics.integrator import rk4_step
from aircraft_simulator.sim.state import State, airspeed
from aircraft_simulator.sim.environment.wind import WindModel
from aircraft_simulator.sim.sensors.airspeed import AirspeedSensor
from aircraft_simulator.sim.sensors.altimeter import Altimeter
from aircraft_simulator.sim.sensors.compass import Compass
from aircraft_simulator.sim.sensors.imu import IMU
from aircraft_simulator.sim.logger.logger import CsvLogger, default_log_path


def truth_from_state(s: State) -> Dict[str, float]:
    return {
        "airspeed_mps": airspeed(s),  # ground-relative unless wind is applied externally
        "altitude_m": -float(s.z),  # NED: z is down
        "heading_rad": float(s.psi),
        "phi_rad": float(s.phi),
        "theta_rad": float(s.theta),
        "p_radps": float(s.p),
        "q_radps": float(s.q),
        "r_radps": float(s.r),
        "u_mps": float(s.u),
        "v_mps": float(s.v),
        "w_mps": float(s.w),
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
    seed: int | None = None,
    wind_ned_mps: tuple[float, float, float] = (0.0, 0.0, 0.0),
) -> Tuple[str, int]:
    params = AircraftParameters()
    limits = ActuatorLimits()

    s = default_initial_state()
    x = s.as_vector()
    t = 0.0

    ap = Autopilot()
    act = ActuatorState(tau_s=actuator_tau, limits=limits)
    act.reset(ControlInputs(throttle=0.5))
    failures = FailureManager()
    # Example scheduled failures (disabled by default; uncomment to use in scripted runs)
    # failures.schedule(15.0, lambda: setattr(failures.act, "elevator_stuck_rad", np.deg2rad(10.0)))
    # failures.schedule(20.0, lambda: failures.sens.dropout.__setitem__("altitude_m", True))

    # Phase 3: sensors + environment
    wind = WindModel(steady_ned_mps=np.array(wind_ned_mps, dtype=float), seed=seed)
    altimeter = Altimeter(seed=None if seed is None else seed + 1)
    airspeed_sensor = AirspeedSensor(seed=None if seed is None else seed + 2)
    compass = Compass(seed=None if seed is None else seed + 3)
    imu = IMU(seed=None if seed is None else seed + 4)

    u_cmd = ControlInputs(throttle=0.5)

    out_path = default_log_path("sim", "csv", "logs")
    logger = CsvLogger(out_path)
    steps = int(np.ceil(tfinal / dt))

    try:
        for _k in range(steps + 1):
            s = State.from_vector(x)
            truth = truth_from_state(s)

            failures.step(t)

            # wind step (NED inertial), convert to body for air-relative velocity
            w_ned = wind.step(dt)
            C_bi = rotation_body_to_inertial(s.phi, s.theta, s.psi)
            w_body = C_bi.T @ w_ned
            v_b = np.array([s.u, s.v, s.w], dtype=float)
            v_air_b = v_b - w_body

            # gravity in body for IMU (NED: +g in down)
            g_i = np.array([0.0, 0.0, params.g_ms2], dtype=float)
            g_b = C_bi.T @ g_i

            # sensor reads (noisy, rate-limited, delayed)
            meas = {
                "altitude_m": altimeter.read(t, -float(s.z), dt),
                "airspeed_mps": airspeed_sensor.read(t, float(np.linalg.norm(v_air_b)), dt),
                "heading_rad": compass.read(t, float(s.psi), dt),
                "phi_rad": float(s.phi),
                "theta_rad": float(s.theta),
            }
            meas.update(
                imu.read(
                    t,
                    pqr_radps=np.array([s.p, s.q, s.r], dtype=float),
                    uvw_mps=v_b,
                    g_b_ms2=g_b,
                    dt=dt,
                )
            )
            meas = failures.apply_sensors(meas)

            ap_debug = {}
            if autopilot_enabled:
                u_cmd, ap_debug = ap.update(meas, targets, dt)

            u_cmd = failures.apply_actuator(u_cmd)
            u = act.update(u_cmd, dt)

            _, _, fm_debug = forces_and_moments_body(s, u, params, limits, uvw_air_mps=v_air_b)

            def f_dyn(ti: float, xi: np.ndarray) -> np.ndarray:
                si = State.from_vector(xi)
                # Hold wind constant over RK4 substeps for determinism
                C_bi_i = rotation_body_to_inertial(si.phi, si.theta, si.psi)
                w_body_i = C_bi_i.T @ w_ned
                v_b_i = np.array([si.u, si.v, si.w], dtype=float)
                v_air_b_i = v_b_i - w_body_i
                F, M, _ = forces_and_moments_body(si, u, params, limits, uvw_air_mps=v_air_b_i)
                return derivatives_6dof(ti, xi, params, F, M)

            # canonical log fields (truth/meas/control)
            row = {
                "t": t,
                "truth_altitude_m": truth["altitude_m"],
                "truth_phi_rad": truth["phi_rad"],
                "truth_theta_rad": truth["theta_rad"],
                "truth_psi_rad": truth["heading_rad"],
                "truth_u_mps": truth["u_mps"],
                "truth_v_mps": truth["v_mps"],
                "truth_w_mps": truth["w_mps"],
                "meas_altitude_m": float(meas.get("altitude_m", float("nan"))),
                "meas_airspeed_mps": float(meas.get("airspeed_mps", float("nan"))),
                "meas_heading_rad": float(meas.get("heading_rad", float("nan"))),
                "u_cmd_throttle": float(u_cmd.throttle),
                "u_cmd_elevator": float(u_cmd.elevator),
                "u_cmd_aileron": float(u_cmd.aileron),
                "u_cmd_rudder": float(u_cmd.rudder),
                "u_throttle": float(u.throttle),
                "u_elevator": float(u.elevator),
                "u_aileron": float(u.aileron),
                "u_rudder": float(u.rudder),
                "wind_n_mps": float(w_ned[0]),
                "wind_e_mps": float(w_ned[1]),
                "wind_d_mps": float(w_ned[2]),
            }
            # keep detailed debug for deep dives (stable schema via prefix)
            row.update({f"ap_{kk}": vv for kk, vv in ap_debug.items()})
            row.update({f"fm_{kk}": vv for kk, vv in fm_debug.items()})

            logger.log(row)

            # integrate
            x = rk4_step(f_dyn, t, x, dt)
            x = post_step_sanitize(x)
            t += dt
    finally:
        logger.close()

    return out_path, steps


def main() -> None:
    p = argparse.ArgumentParser(description="6-DOF aircraft simulator (Phase 3: sensors + wind + failures)")
    p.add_argument("--tfinal", type=float, default=20.0)
    p.add_argument("--dt", type=float, default=0.01)
    p.add_argument("--autopilot", action="store_true", help="enable PID autopilot")
    p.add_argument("--V", type=float, default=35.0, help="target airspeed [m/s]")
    p.add_argument("--alt", type=float, default=1000.0, help="target altitude [m]")
    p.add_argument("--hdg", type=float, default=0.0, help="target heading [deg]")
    p.add_argument("--act_tau", type=float, default=0.15, help="actuator time constant [s]")
    p.add_argument("--seed", type=int, default=1, help="random seed for wind/sensors")
    p.add_argument("--wind_n", type=float, default=0.0, help="steady wind North [m/s]")
    p.add_argument("--wind_e", type=float, default=0.0, help="steady wind East [m/s]")
    p.add_argument("--wind_d", type=float, default=0.0, help="steady wind Down [m/s]")
    args = p.parse_args()

    targets = AutopilotTargets(airspeed_mps=args.V, altitude_m=args.alt, heading_rad=np.deg2rad(args.hdg))
    out_path, steps = run(
        args.tfinal,
        args.dt,
        args.autopilot,
        targets,
        args.act_tau,
        seed=args.seed,
        wind_ned_mps=(args.wind_n, args.wind_e, args.wind_d),
    )
    print(f"Wrote {steps} steps to {out_path}")


if __name__ == "__main__":
    main()


