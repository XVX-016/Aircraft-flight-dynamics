## Control Architecture

- **Inner loops**: PID roll/pitch/yaw-damper (`sim/control/autopilot.py`).
- **Outer loops**: Airspeed, altitude, heading.
- **Advanced hooks**:
  - LQR utilities in `sim/control/lqr.py`.
  - Gain scheduling scaffolding in `sim/control/gain_scheduling.py`.


