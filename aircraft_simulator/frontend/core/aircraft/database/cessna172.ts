import { AircraftConfig } from "../aircraft";

export const CESSNA_172R: AircraftConfig = {
    name: "Cessna 172R",
    mass: {
        mass: 1111,
        ixx: 1285,
        iyy: 1824,
        izz: 2666,
        ixz: 0
    },
    geometry: {
        wingArea: 16.2,
        wingSpan: 11.0,
        meanChord: 1.49
    },
    aero: {
        // Longitudinal
        cL0: 0.25,
        cLa: 5.7,
        cLq: 8.5,
        cLde: 0.4,

        cD0: 0.027,
        k: 0.053,

        cm0: 0.02,
        cma: -3.8,
        cmq: -8.5,
        cmde: -1.2,

        // Lateral
        cyb: -0.98,
        clb: -0.12,
        cnb: 0.15,
        clp: -0.5,
        cnr: -0.2,
        clda: 0.08,
        cndr: -0.06
    },
    propulsion: {
        maxThrust: 2400 // Approx ~160hp propeller static thrust (conservative placeholder)
    }
};
