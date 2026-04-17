# ADCS-SIM: Advanced Aircraft Dynamics and Control Simulation

[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.103.1-009688.svg?style=flat&logo=fastapi)](https://fastapi.tiangolo.com/)
[![Next.js](https://img.shields.io/badge/Next.js-14-black.svg?style=flat&logo=nextdotjs)](https://nextjs.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

ADCS-SIM is a high-fidelity, full-envelope flight dynamics and control research platform. It combines a rigorous 6-DOF nonlinear physics engine with modern state-space control theory and real-time 3D visualization, designed for aerospace engineering education and autopilot research.

---

## 🚀 Core Features

### ✈️ 6-DOF Flight Physics
- **Nonlinear Dynamics**: High-fidelity 6-DOF rigid body equations of motion solved via **Runge-Kutta 4 (RK4)** integration.
- **Flight Envelope**: Comprehensive aerodynamic modeling covering stall, high-alpha, and Mach-dependent effects.
- **Dryden Turbulence**: Stochastic wind model implementing MIL-F-8785C standards for atmospheric disturbance simulation.

### 🕹️ Advanced Controls & Autopilot
- **Full-State LQR**: Integrated Longitudinal and Lateral-Directional **Linear Quadratic Regulators** for robust trajectory tracking.
- **Spiral Stability**: Active LQR-based stabilization for traditionally unstable spiral modes.
- **Trim Solver**: Nonlinear constrained optimization for finding steady-state level flight, climbing, or turning equilibrium.

### 🧪 Stability & Analysis Lab
- **Modal Analysis**: Automatic extraction of Short Period, Phugoid, Dutch Roll, and Spiral modes.
- **Linearization Engine**: Finite-difference state-space extraction ($A, B, C, D$ matrices) at any flight condition.
- **Frequency Response**: Real-time Bode and Root Locus analysis for stability margin verification.

### 📡 State Estimation & Telemetry
- **EKF Integration**: Extended Kalman Filter for sensor fusion, estimating aircraft state from noisy measurement streams.
- **50Hz WebSocket Data**: Low-latency, binary-optimized telemetry stream driving the frontend at 50Hz.

### 🎮 Real-time Visualization
- **React Three Fiber (WebGL)**: 3D flight deck with Chase, Top-Down, and Side-Profile cameras.
- **Glass Cockpit HUD**: Modern instrument panel with real-time charts for Altitude, Airspeed, and Control Effort.

### 🎥 Flight Replay Theater
- **Offline 3D Trajectory Reconstruction**: Load exported CSV telemetry for post-flight analysis.
- **Synchronized Scrubbing**: Interactive timeline controls that simultaneously update altitude, airspeed, pitch, and roll charts.

### ✏️ Custom Aircraft Design
- **Full Parameter Editor**: Modify mass, inertia, geometry, and aerodynamic derivatives in the Hangar interface.
- **Live Analysis**: Real-time trim and stability analysis before flight to validate custom configurations.

---

## 🛠️ Technology Stack

| Layer | Technologies |
| :--- | :--- |
| **Backend** | Python 3.10, FastAPI, Scipy, Numpy, FilterPy |
| **Frontend** | Next.js 14, React, Three.js (R3F), TailwindCSS, Recharts |
| **Integrator** | Runge-Kutta 4 (RK4) |
| **Communication** | WebSockets (High-Frequency Stream) |

---

## ✈️ Aircraft Models

ADCS-SIM includes validated aircraft models covering different stability characteristics:

| Model | Classification | Stability | Notes |
|-------|----------------|-----------|-------|
| **Cessna 172R** | Trainer | Stable | Conventional stable aircraft, excellent for learning basic flight dynamics |
| **F-16** | Fighter | Relaxed | High-performance fighter with relaxed static stability, requires active LQR control |

---

## 🏁 Getting Started

### 1. Prerequisites
- Python 3.10 or higher
- Node.js 18.x or higher
- `npm` or `yarn`

### 2. Backend Setup
```bash
# Clone the repository
git clone https://github.com/your-username/aircraft-flight-dynamics.git
cd aircraft-flight-dynamics

# Create virtual environment
python -m venv venv
source venv/bin/activate  # venv\Scripts\activate on Windows

# Install dependencies
pip install -r requirements.txt

# Start the simulation engine
python -m uvicorn backend_api.app:app --reload --port 8000
```

### 3. Frontend Setup
```bash
# Navigate to frontend directory
cd aircraft_simulator/frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) to access the Flight Deck.

---

## 🏗️ Architecture

ADCS-SIM utilizes a decoupled architecture to separate heavy numerical computation from client-side rendering:

1.  **Physics Core (`adcs_core`)**: Pure Python implementation of aircraft dynamics. Dependency-free for maximum portability.
2.  **API Layer (`backend_api`)**: FastAPI handles long-lived WebSocket connections. It manages a `SimRuntime` instance that steps the physics engine at 50Hz.
3.  **UI (`frontend`)**: A React-based dashboard. It consumes the telemetry stream and updates the 3D scene and HUD metrics with sub-millisecond latency.

---

## 📊 Project Layout

```text
├── adcs_core/              # Physics, Aero, and Control logic
│   ├── aircraft/           # Model definitions (Cessna 172, F-16)
│   ├── analysis/           # LQR, Trim, and Modal analysis solvers
│   └── state/              # 12-state vector definitions
├── backend_api/            # FastAPI endpoints and SimRuntime
├── aircraft_simulator/
│   ├── frontend/           # Next.js / React Three Fiber UI
│   └── scripts/            # Batch analysis and artifact generation
└── docs/                   # Detailed technical formulation
```

---

## � Screenshots

- Flight Deck Interface: `docs/screenshots/flight_deck.png`
- Flight Replay Theater: `docs/screenshots/flight_replay.png`
- Custom Aircraft Hangar: `docs/screenshots/hangar_custom.png`

---

## �📄 License

This project is licensed under the MIT License - see the `LICENSE` file for details.
