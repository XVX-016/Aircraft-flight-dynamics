# Aircraft Simulator (6-DOF + Autopilot)

Phase 1 implements a **12-state 6-DOF rigid-body model** (Euler angles), **RK4 integrator**, **placeholder aero/prop forces & moments**, and a **minimal PID autopilot** (airspeed + pitch hold).

## Quickstart (Windows PowerShell)

```powershell
cd "C:\Computing\Aircraft flight dynamics\aircraft_simulator"
python -m venv venv
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
python -m sim.simulator --tfinal 20 --dt 0.01 --autopilot
```

Outputs:
- A CSV log is written to `logs/` (created automatically).

## Phase 4: Live UI (FastAPI + WebSocket)

Start the server:

```powershell
cd "C:\Computing\Aircraft flight dynamics\aircraft_simulator"
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt
uvicorn api.app:app --reload --port 8000
```

Open in your browser:
- `http://localhost:8000/`


