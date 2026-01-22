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

---

## Project Structure

The project is organized into modular components for scalability and clarity:

### 1. Physics Engine (`/aircraft_simulator/sim`)
- `dynamics/`: Non-linear and linearized 6-DOF equations of motion.
- `control/`: LQR synthesis, gain scheduling, and autopilot logic.
- `estimation/`: EKF implementation and sensor noise models.
- `models/`: Fixed-wing aircraft and UAV configuration parameters.

### 2. Analysis & Tools (`/aircraft_simulator`)
- `api/`: FastAPI backend for real-time simulation data streaming.
- `reports/`: Automated PDF report generators and validation metrics.
- `scripts/`: Optimization and batch simulation utilities.

### 3. Flight Deck Dashboard (`/aircraft_simulator/frontend`)
- `app/`: Next.js App Router for navigation and simulated environment views.
- `components/`:
  - `simulator/`: Domain-specific components (3D View, Telemetry, Controls).
  - `ui/`: Shared base UI components.
- `stores/`: Simulation state management using Zustand.

---

## UI/UX Blueprint
To maintain a professional, engineering-grade experience, we adhere to a "Boeing-grade" design system:
- **Aesthetic**: Dark-themed, high-contrast UI with technical grid overlays.
- **Palette**: Aviation Blue (Status), Safety Orange (Warnings), Aerospace Green (Success).
- **Mockups**: Located in `aircraft_simulator/frontend/public/design/`.

---

## Validation Metrics

The system is validated using:
*   **Closed-loop Eigenvalues**: Verified to be in the Left Half Plane (LHP).
*   **Step Response**: Pitch tracking overshoot < 5%, Settling time < 2s.
*   **EKF Innovation**: Zero-mean residual check.

---

> Built for learning & aerospace systems engineering • Not flight-certified software.
