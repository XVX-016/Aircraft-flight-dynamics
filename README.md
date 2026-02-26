# Aircraft Flight Dynamics Control Project

Technically grounded fixed-wing flight dynamics and control project with:
- nonlinear 6-DOF dynamics
- nonlinear trim solve
- finite-difference linearization
- modal analysis
- longitudinal LQR design
- reproducibility and architecture enforcement tests

## Run

### Backend API
From repo root:

```bash
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn backend_api.app:app --reload --port 8000
```

Compatibility entrypoint still works:

```bash
python -m uvicorn aircraft_simulator.api.app:app --reload --port 8000
```

API docs:

```text
http://127.0.0.1:8000/docs
```

### Frontend
From `aircraft_simulator/frontend`:

```bash
npm install
npm run dev
```

Set `aircraft_simulator/frontend/.env.local`:

```text
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## Generate Report Artifacts

Run trim-first open/closed-loop artifact generation:

```bash
python aircraft_simulator/scripts/generate_artifacts.py --aircraft-id cessna_172r --speed-mps 60 --outdir aircraft_simulator/plots/phase_report
```

Outputs include:
- eigenvalue plots (open-loop and closed-loop longitudinal)
- perturbation recovery plots (open vs closed)
- closed-loop control effort plot
- CSV summaries (trim, eigenvalues, modal summary, LQR gain, response metrics)

## Docs

- Formulation: `docs/control_formulation.md`
- Determinism policy: `docs/determinism_policy.md`
- Results interpretation: `docs/results_interpretation.md`
- Report table template: `docs/report_table_template.md`

## Test and Gates

Run full tests:

```bash
python -m pytest -q
```

Key enforcement gates:
- baseline invariants
- public API surface freeze
- architecture boundary test
- external import boundary test

## Project Layout

```text
adcs_core/                  # physics and control engine
backend_api/                # FastAPI adapter layer
aircraft_simulator/frontend # UI
aircraft_simulator/scripts  # artifact generation scripts
docs/                       # technical and interpretation docs
```
