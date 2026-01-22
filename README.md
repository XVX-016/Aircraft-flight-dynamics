![alt text](image.png)# Aircraft Flight Dynamics & Control Analysis Tool

![Project Status: Validated](https://img.shields.io/badge/Status-Internship--Ready-brightgreen)
![Python 3.11](https://img.shields.io/badge/Python-3.11-blue)
![Next.js](https://img.shields.io/badge/Frontend-Next.js-black)

## Overview

This project is a **control design and state estimation analysis tool** for fixed-wing aircraft, built as a learning and portfolio project to demonstrate applied aerospace systems engineering.

It focuses on:
*   **Linearized Flight Dynamics**: 6-DOF rigid-body physics.
*   **Optimal Control (LQR)**: Gain-scheduled controller synthesis and stability analysis.
*   **State Estimation (EKF)**: Extended Kalman Filter with sensor noise modeling.
*   **Validation**: Automated generation of engineering reports (PDF) with metrics.

## Core Capabilities

*   **Simulation**: 12-state 6-DOF rigid-body model (Euler angles) with RK4 integrator.
*   **Control**: LQR feedback with gain scheduling for airspeed variations.
*   **Estimation**: EKF for state reconstruction from noisy sensors (IMU, GPS, Pitot).
*   **Analysis**: Monte Carlo robustness testing against stochastic wind gusts.
*   **Reporting**: Automated generation of PDF design reports with eigenvalues, step responses, and RMSE metrics.

## Technical Stack

*   **Backend**: Python, NumPy, SciPy, Control Library, FastAPI
*   **Frontend**: Next.js (React), TailwindCSS, Recharts, Three.js
*   **Analysis**: Matplotlib, Pandas, FPDF

---

## Quick Start (Windows)

### 1. Backend Setup (Physics Engine)

```powershell
# From project root
python -m venv venv
.\venv\Scripts\activate
pip install -r aircraft_simulator/requirements.txt
```

### 2. Frontend Setup (Dashboard)

```powershell
cd aircraft_simulator/frontend
npm install
```

### 3. Running the Simulation

**Option A: Full Interactive UI**

1.  **Start Backend**:
    ```powershell
    # Terminal 1 (Root)
    .\venv\Scripts\activate
    uvicorn aircraft_simulator.api.app:app --reload --port 8001
    ```

2.  **Start Frontend**:
    ```powershell
    # Terminal 2 (aircraft_simulator/frontend)
    npm run dev
    ```

3.  **Open**: `http://localhost:3000`

**Option B: Generate Engineering Report**

Run the validation suite and generate a PDF report:

```powershell
# From project root (with venv activated)
python requirements_figures.py
python aircraft_simulator/reports/report_generator.py
```
Output: `aircraft_simulator/reports/output/aircraft_control_report.pdf`

---

## Key Files

*   `aircraft_simulator/sim/dynamics/equations.py`: 6-DOF equations of motion.
*   `aircraft_simulator/sim/control/autopilot.py`: Control logic implementation.
*   `aircraft_simulator/sim/control/gain_schedule.py`: Gain scheduling logic.
*   `aircraft_simulator/sim/models/uav_longitudinal.py`: UAV-specific dynamics model.
*   `aircraft_simulator/sim/analysis/monte_carlo.py`: Robustness testing script.

## Validation Metrics

The system is validated using:
*   **Closed-loop Eigenvalues**: Verified to be in the Left Half Plane (LHP).
*   **Step Response**: Pitch tracking overshoot < 5%, Settling time < 2s.
*   **EKF Innovation**: Zero-mean residual check.

---

> Built for learning & aerospace systems engineering • Not flight-certified software.
