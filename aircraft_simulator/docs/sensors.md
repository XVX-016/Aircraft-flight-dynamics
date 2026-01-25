## Sensors & Estimation

- **Sensors**:
  - IMU, airspeed, altimeter, compass (`sim/sensors/*`).
  - Each sensor models noise, bias random walk, sample rate, and delay.
- **Estimation**:
  - `sim/estimation/complementary_filter.py` provides an attitude complementary filter suitable as a front-end to the autopilot.


