import { Vector3 } from "./state";

/**
 * Aerodynamic Coefficients (Linear Stability Derivatives)
 * Based on standard US stability axes convention.
 * Units: per radian where applicable.
 */
export interface AeroCoefficients {
    // Longitudinal
    CL0: number;       // Lift at zero alpha
    CL_alpha: number;  // Lift slope
    CL_q: number;      // Lift due to pitch rate
    CL_de: number;     // Lift due to elevator

    CD0: number;       // Parasitic drag
    CD_alpha: number;  // Drag due to alpha (simple polar approximation usually preferred, but here for completeness)
    CD_de: number;     // Drag due to elevator

    Cm0: number;       // Pitch moment at zero alpha
    Cm_alpha: number;  // Pitch stability
    Cm_q: number;      // Pitch damping
    Cm_de: number;     // Elevator pitch authority

    // Lateral-Directional
    CY_beta: number;   // Side force due to beta
    CY_p: number;      // Side force due to roll rate
    CY_r: number;      // Side force due to yaw rate
    CY_da: number;     // Side force due to aileron
    CY_dr: number;     // Side force due to rudder

    Cl_beta: number;   // Dihedral effect (Roll stability)
    Cl_p: number;      // Roll damping
    Cl_r: number;      // Roll due to yaw rate
    Cl_da: number;     // Aileron roll authority
    Cl_dr: number;     // Rudder roll authority

    Cn_beta: number;   // Weathercock stability (Yaw stability)
    Cn_p: number;      // Yaw due to roll rate
    Cn_r: number;      // Yaw damping
    Cn_da: number;     // Aileron yaw authority (Adverse yaw)
    Cn_dr: number;     // Rudder yaw authority
}

/**
 * Mass and Inertia Properties
 */
export interface MassProperties {
    mass: number;       // kg
    /**
     * Inertia Tensor diagonal + cross products
     * [ Ixx, 0, -Ixz ]
     * [ 0, Iyy, 0 ]
     * [ -Ixz, 0, Izz ]
     */
    Ixx: number;        // kg*m^2
    Iyy: number;
    Izz: number;
    Ixz: number;

    /**
     * Center of Gravity relative to datum (usually nose or leading edge)
     */
    cg: Vector3;
}

/**
 * Geometric Properties for Aero Normalization
 */
export interface AeroGeometry {
    wingArea: number;   // S (m^2)
    wingSpan: number;   // b (m)
    chord: number;      // c (m) - Mean Aerodynamic Chord
}

/**
 * Engines / Propulsion
 */
export interface EngineConfig {
    position: Vector3;  // Relative to datum
    direction: Vector3; // Thrust vector direction (usually -1, 0, 0 for forward facing exhaust?) Or 1,0,0 force? Convention: Force acts forward.
    maxThrust: number;  // Newtons
}

/**
 * Control Surface Limits (Physical)
 */
export interface ControlLimits {
    elevatorMin: number; // Rad
    elevatorMax: number; // Rad
    aileronMax: number;  // Rad (symmetric)
    rudderMax: number;   // Rad (symmetric)
}

/**
 * Master Aircraft Configuration
 * This is the immutable JSON structure loaded at runtime.
 */
export interface AircraftConfig {
    id: string;
    name: string;
    description?: string;

    massProps: MassProperties;
    geometry: AeroGeometry;
    aero: AeroCoefficients;
    propulsion: EngineConfig[];
    controls: ControlLimits;

    // Visuals
    meshUrl: string; // Path to GLB
    scale: number;
}
