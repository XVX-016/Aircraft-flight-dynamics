
export interface FlightRecord {
    time: number;
    x: number;
    y: number;
    z: number;
    phi_deg: number;
    theta_deg: number;
    psi_deg: number;
    u: number;
    v: number;
    w: number;
    altitude_m: number;
}

export type ScenarioLabel = 
    | "Banked Turn / Steep Turn"
    | "Climb/Descent"
    | "Variable Speed Profile"
    | "Crosswind Drift"
    | "Straight and Level";
