## Validation & Test Strategy

- **Unit tests**:
  - Aerodynamics, actuators, PID, sensors (`tests/test_*.py`).
- **System-level tests**:
  - Altitude step-response metrics, disturbance runs, failure smoke tests.
- **Logging & analysis**:
  - Canonical CSV logs from `sim/simulator.py`.
  - `scripts/plot_log.py` for standard plots and step metrics.


