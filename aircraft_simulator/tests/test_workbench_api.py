from copy import deepcopy

from fastapi.testclient import TestClient

from backend_api.app import app


client = TestClient(app)


CUSTOM_AIRCRAFT = {
    "custom_aircraft": {
        "id": "custom_test",
        "name": "Custom Test Aircraft",
        "classification": "custom",
        "stability_mode": "stable",
        "geometry": {
            "wing_area": 16.2,
            "wingspan": 11.0,
            "mean_aerodynamic_chord": 1.5,
            "tail_arm": 4.5,
            "cg_location": 0.3,
        },
        "inertia": {
            "mass": 1100.0,
            "Ixx": 1285.0,
            "Iyy": 1824.0,
            "Izz": 2666.0,
            "Ixz": 0.0,
        },
        "aero": {
            "Xu": -0.03,
            "Xw": 0.0,
            "Zu": -0.4,
            "Zw": -5.5,
            "Mu": 0.0,
            "Mw": -0.8,
            "Mq": -10.0,
            "Yv": -0.3,
            "Lv": -0.1,
            "Lp": -2.7,
            "Nr": -0.35,
        },
        "params": {
            "rho_kgm3": 1.225,
            "max_thrust_N": 4000.0,
            "CL0": 0.25,
            "CL_alpha_per_rad": 4.5,
            "CL_q": 8.5,
            "CL_de_per_rad": 0.4,
            "CD0": 0.025,
            "CD_k": 0.053,
            "Cm0": 0.0,
            "Cm_alpha_per_rad": -0.8,
            "Cm_q_per_rad": -10.0,
            "Cm_de_per_rad": -1.2,
            "CY_beta_per_rad": -0.3,
            "CY_dr_per_rad": 0.15,
            "Cl_beta_per_rad": -0.1,
            "Cl_p": -2.7,
            "Cl_r": 0.15,
            "Cl_da_per_rad": 0.2,
            "Cl_dr_per_rad": 0.01,
            "Cn_beta_per_rad": 0.15,
            "Cn_p": -0.05,
            "Cn_r": -0.35,
            "Cn_da_per_rad": -0.02,
            "Cn_dr_per_rad": -0.08,
        },
        "limits": {
            "elevator_max_rad": 0.4363323129985824,
            "aileron_max_rad": 0.3490658503988659,
            "rudder_max_rad": 0.5235987755982988,
        },
        "metadata": {"source": "pytest"},
    },
    "V_mps": 60.0,
    "altitude_m": 1000.0,
    "isa_temp_offset_c": 0.0,
    "headwind_mps": 0.0,
    "crosswind_mps": 0.0,
}


def test_custom_aircraft_analyze_endpoint_returns_metrics():
    response = client.post("/api/v1/aircraft/custom/analyze", json=CUSTOM_AIRCRAFT)
    payload = response.json()
    assert response.status_code == 200
    assert "computed_metrics" in payload
    assert "A" in payload and "B" in payload


def test_custom_aircraft_bad_input_is_rejected():
    bad_payload = deepcopy(CUSTOM_AIRCRAFT)
    bad_payload["custom_aircraft"]["params"]["Cm_de_per_rad"] = 0.0
    response = client.post("/api/v1/aircraft/custom/analyze", json=bad_payload)
    payload = response.json()
    assert response.status_code == 200
    assert "error" in payload
    assert "Cm_de_per_rad" in payload["error"]


def test_step_response_endpoint_returns_traces():
    response = client.post("/api/v1/analysis/step-response", json={"aircraft_id": "cessna_172r", "V_mps": 60.0})
    payload = response.json()
    assert response.status_code == 200
    assert "traces" in payload
    assert "open_loop" in payload["traces"]
    assert "closed_loop" in payload["traces"]


def test_step_response_endpoint_is_deterministic():
    payload = {"aircraft_id": "cessna_172r", "V_mps": 60.0, "duration_s": 5.0, "dt_s": 0.1}
    first = client.post("/api/v1/analysis/step-response", json=payload).json()
    second = client.post("/api/v1/analysis/step-response", json=payload).json()
    assert first["metrics"] == second["metrics"]
    assert first["traces"]["closed_loop"]["airspeed_mps"] == second["traces"]["closed_loop"]["airspeed_mps"]


def test_estimation_endpoint_returns_consistency_series():
    response = client.post("/api/v1/estimation/run", json={"aircraft_id": "cessna_172r", "V_mps": 60.0, "duration_s": 3.0})
    payload = response.json()
    assert response.status_code == 200
    assert len(payload["nis"]) == len(payload["time_s"])
    assert len(payload["nees"]) == len(payload["time_s"])


def test_validation_endpoint_returns_checks():
    response = client.post("/api/v1/validation/run", json={"aircraft_id": "cessna_172r", "V_mps": 60.0})
    payload = response.json()
    assert response.status_code == 200
    assert payload["checks"]
    assert any(check["key"] == "trim_residual" for check in payload["checks"])


def test_validation_endpoint_flags_bad_custom_aircraft():
    bad_payload = deepcopy(CUSTOM_AIRCRAFT)
    bad_payload["custom_aircraft"]["aero"]["Mq"] = 0.0
    response = client.post("/api/v1/validation/run", json=bad_payload)
    payload = response.json()
    assert response.status_code == 200
    assert "error" in payload
    assert "aero.Mq" in payload["error"]
