# Report Table Template

Use these tables directly in your lab report. Fill values from generated CSVs in `aircraft_simulator/plots/phase_report`.

## Table 1. Trim Operating Point

| Aircraft | Speed (m/s) | alpha (rad) | theta (rad) | throttle (-) | elevator (rad) | u (m/s) | w (m/s) |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| Cessna 172R |  |  |  |  |  |  |  |
| F-16 Research |  |  |  |  |  |  |  |

Source: `trim_summary.csv`

## Table 2. Open-Loop Stability Summary

| Aircraft | max Re(lambda) | unstable modes | spectral margin | min damping ratio |
| --- | ---: | ---: | ---: | ---: |
| Cessna 172R |  |  |  |  |
| F-16 Research |  |  |  |  |

Source: `modal_summary.csv` + `eigenvalues_open_loop.csv`

## Table 3. Longitudinal LQR Design

| Case | Q diag | R diag | K row 1 (elevator) | K row 2 (throttle) | max Re(lambda_open_lon) | max Re(lambda_closed_lon) |
| --- | --- | --- | --- | --- | ---: | ---: |
| Baseline | [1,10,100,50] | [1,0.5] |  |  |  |  |

Source: `lqr_gain_matrix.csv` + longitudinal eigenvalues

## Table 4. Nonlinear Open vs Closed Response

| Scenario | Peak q (rad/s) | Final error norm |
| --- | ---: | ---: |
| Open-loop |  |  |
| Closed-loop |  |  |

Source: `response_metrics.csv`

## Table 5. Interpretation Notes (Short)

| Observation | Evidence | Interpretation |
| --- | --- | --- |
| Closed-loop poles moved left | `eigs_lqr_longitudinal.png` | Increased local damping/stability |
| Closed-loop final error reduced | `response_error_open_closed.png` | Better perturbation recovery |
| Control effort within limits | `control_effort_closed.png` | Feasible actuator usage in tested case |
