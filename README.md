# Aircraft Flight Dynamics Simulator

A high-fidelity, web-based 6-DOF aircraft flight simulator built with **Next.js**, **React Three Fiber**, and **Tailwind CSS**.

## Features

### ✈️ High-Fidelity Physics
- **6-DOF Rigid Body Dynamics**: Full simulation of forces and moments (Lift, Drag, Thrust, Gravity).
- **Aerodynamic Model**: Configurable coefficients ($C_L$, $C_D$, $C_m$) based on Angle of Attack ($\alpha$) and Sideslip ($\beta$).
- **Mass Properties**: Realistic inertia tensor and center of gravity management.
- **Runge-Kutta 4** (or Euler) integration for stability.

### 🎮 Pilot Deck (HUD)
- **Glass Cockpit UI**: Minimalist, HUD-style overlay maximizing the 3D view.
- **Real-Time Telemetry**: Altitude, Airspeed, Heading, Attitude (Roll/Pitch).
- **Control Interface**: Visualizers for Throttle, Elevator, Aileron, and Rudder inputs.
- **Flight Modes**: 
  - **Takeoff**: Runway scene with ground interaction.
  - **Free Flight**: Open sky for maneuvering.

### 📊 Estimation & EKF (Extended Kalman Filter)
- **tier-1 Estimation**: Implementation of a 15-state EKF.
- **Sensor Models**: Simulated GPS (Position) and IMU (Gyro/Accel) with configurable noise and bias.
- **State Estimation**: Fuses noisy sensor data to estimate optimal state ($\hat{x}$).
- **Analysis Page**: Real-time plotting of True State vs. Estimated State.

### 💨 Flow Visualization
- **GPU Particles**: Custom shader-based particle system visualizing local airflow.
- **Physics-Driven**: Particles react to True Airspeed, AoA ($\alpha$), and Sideslip ($\beta$).

## Architecture

### Tech Stack
- **Frontend**: React 19, Next.js 14 (App Router)
- **3D Rendering**: React Three Fiber (Three.js)
- **Styling**: Tailwind CSS v4 ("Stealth" Palette)
- **State Management**: Zustand (UI), Custom Singleton (Physics Core)
- **Math**: mathjs (EKF Matrices), custom Vector/Quaternion lib.

### System Design
1.  **Simulation Core**: A frame-rate independent physics loop running at 100Hz (`SimulationEngine`).
2.  **Visuals**: A decoupled rendering loop interpolating state snapshots for smooth 60fps+ animation (`SimulationManager` + `SimulationScene`).
3.  **Estimation**: An independent observer loop running the EKF, correcting estimates based on Sensor outputs.

## Getting Started

1.  **Install Dependencies**:
    ```bash
    npm install
    ```

2.  **Run Development Server**:
    ```bash
    npm run dev
    ```

3.  **Open Simulator**:
    Navigate to `http://localhost:3000`.

## Key Files
- `lib/simulation/physics/`: Core dynamics and aerodynamics.
- `lib/simulation/estimation/`: EKF implementation and sensor models.
- `components/pilot/PilotDeck.tsx`: Main HUD interface.
- `components/simulation/visuals/FlowField.tsx`: GPU flow visualization.

## License
MIT
