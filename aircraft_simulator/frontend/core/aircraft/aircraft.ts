export interface MassProperties {
    mass: number;
    ixx: number;
    iyy: number;
    izz: number;
    ixz: number;
}

export interface Geometry {
    wingArea: number;
    wingSpan: number;
    meanChord: number;
}

export interface AeroCoefficients {
    // Longitudinal
    cL0: number;
    cLa: number;
    cLq: number;
    cLde: number;

    cD0: number;
    k: number; // Induced drag factor

    cm0: number;
    cma: number;
    cmq: number;
    cmde: number;

    // Lateral-Directional
    cyb: number; // Side force due to beta
    clb: number; // Roll due to beta (dihedral)
    cnb: number; // Yaw due to beta (directional stability)
    clp: number; // Roll damping
    cnr: number; // Yaw damping
    clda: number; // Aileron
    cndr: number; // Rudder
}

export interface Propulsion {
    maxThrust: number;
}

export interface AircraftConfig {
    name: string;
    mass: MassProperties;
    geometry: Geometry;
    aero: AeroCoefficients;
    propulsion: Propulsion;
}
