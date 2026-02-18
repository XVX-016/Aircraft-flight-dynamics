# Aircraft Flight Dynamics Analysis Platform

A backend-authoritative 6-DOF aircraft trim, linearization, and stability analysis platform built with **FastAPI (Python)** and **Next.js (React)**.

This system computes full rigid-body aircraft dynamics in the backend and presents engineering analysis results in a disciplined frontend interface. No physics is executed in the browser.

---

## Core Capabilities

- **Full 6-DOF Rigid Body Dynamics**  
  Nonlinear force and moment coupling solved in Python.

- **Trim Computation**  
  Steady-state equilibrium solution for selected aircraft configuration.

- **Finite-Difference Linearization**  
  Central-difference Jacobian of the full nonlinear model.

- **Eigenvalue Stability Analysis**  
  Open-loop stability classification from the state matrix `A`.

- **Authoritative Aircraft Database (MVP)**  
  - Cessna 172R — Conventional statically stable aircraft  
  - F-16 Research Model — Relaxed static stability configuration  

- **Hangar 3D Viewer**  
  Visual reference only.  
  No geometry, inertia, or physics are computed in the browser.

---

## Architectural Principles

- All flight dynamics are computed in the backend (Python).
- The frontend performs no physics, integration, or force/moment computation.
- No client-side simulation state exists.
- Aircraft parameters are authoritative from the backend database.
- Stability classification is determined strictly from the eigenvalues of the linearized system.

---

## Stability Classification

After trim and linearization, the aircraft configuration is classified as:

- **Open-Loop Stable Configuration**  
  All eigenvalues of the state matrix `A` have non-positive real parts.

- **Relaxed / Unstable Configuration**  
  At least one eigenvalue has a positive real part.

This classification reflects the true open-loop dynamics of the 6-DOF model.

---

## Tech Stack

### Backend
- FastAPI (Python)
- NumPy / SciPy (numerical methods)

### Frontend
- React 19
- Next.js 14 (App Router)
- Tailwind CSS v4 (engineering aesthetic)
- React Three Fiber (Three.js) for static hangar visualization

---

## Getting Started

### 1) Backend (FastAPI)

From the project root:

```bash
python -m venv venv
venv\Scripts\activate   # Windows
# source venv/bin/activate  # macOS/Linux

pip install -r requirements.txt

python -m uvicorn aircraft_simulator.api.app:app --reload --port 8000 --app-dir .
```

Verify backend is running:

```
http://127.0.0.1:8000/docs
```

---

### 2) Frontend (Next.js)

From:

```
aircraft_simulator/frontend
```

Install dependencies:

```bash
npm install
```

Create `frontend/.env.local`:

```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

Start dev server:

```bash
npm run dev
```

Open:

```
http://localhost:3000
```

---

## Project Structure

```
aircraft_simulator/
│
├── api/
│   └── app.py                 # FastAPI endpoints (select, trim, linearize)
│
├── sim/
│   ├── aircraft/database.py   # Authoritative aircraft definitions
│   ├── analysis/trim.py       # Trim computation
│   ├── analysis/linearize.py  # Finite-difference Jacobian
│   └── model.py               # Full 6-DOF nonlinear dynamics
│
└── frontend/
    ├── app/                   # Next.js App Router pages
    ├── context/               # AircraftContext (backend-driven state)
    ├── lib/api/               # Backend API layer
    └── components/            # UI components
```

---

## MVP Scope

The current MVP supports:

* Aircraft selection (Cessna 172R, F-16)
* Trim computation
* Linearization
* A-matrix display
* Eigenvalue stability classification

No control law synthesis, state estimation, or closed-loop augmentation are included in the base MVP.

---

## Troubleshooting

### Backend import error

`ModuleNotFoundError: No module named 'aircraft_simulator'`

Ensure you are running uvicorn from the project root:

```bash
python -m uvicorn aircraft_simulator.api.app:app --reload --port 8000 --app-dir .
```

---

### Frontend shows “Backend unavailable”

Verify:

1. Backend is running at:

   ```
   http://127.0.0.1:8000/docs
   ```

2. `frontend/.env.local` contains:

   ```
   NEXT_PUBLIC_API_BASE=http://localhost:8000
   ```

3. Restart the frontend dev server after editing `.env.local`.

---

### CORS errors in the browser console

Ensure the FastAPI app includes CORS middleware and restart uvicorn.

---

## License

MIT
