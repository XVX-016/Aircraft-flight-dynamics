"use client";

export type StabilityMode = "stable" | "relaxed" | "unstable";

export interface CustomAircraftDefinition {
    id: string;
    name: string;
    classification: string;
    stability_mode: StabilityMode;
    geometry: {
        wing_area: number;
        wingspan: number;
        mean_aerodynamic_chord: number;
        tail_arm: number;
        cg_location: number;
    };
    inertia: {
        mass: number;
        Ixx: number;
        Iyy: number;
        Izz: number;
        Ixz: number;
    };
    aero: {
        Xu: number;
        Xw: number;
        Zu: number;
        Zw: number;
        Mu: number;
        Mw: number;
        Mq: number;
        Yv: number;
        Lv: number;
        Lp: number;
        Nr: number;
    };
    params: {
        rho_kgm3: number;
        max_thrust_N: number;
        CL0: number;
        CL_alpha_per_rad: number;
        CL_q: number;
        CL_de_per_rad: number;
        CD0: number;
        CD_k: number;
        Cm0: number;
        Cm_alpha_per_rad: number;
        Cm_q_per_rad: number;
        Cm_de_per_rad: number;
        CY_beta_per_rad: number;
        CY_dr_per_rad: number;
        Cl_beta_per_rad: number;
        Cl_p: number;
        Cl_r: number;
        Cl_da_per_rad: number;
        Cl_dr_per_rad: number;
        Cn_beta_per_rad: number;
        Cn_p: number;
        Cn_r: number;
        Cn_da_per_rad: number;
        Cn_dr_per_rad: number;
    };
    limits: {
        elevator_max_rad: number;
        aileron_max_rad: number;
        rudder_max_rad: number;
    };
    metadata: {
        source: string;
        notes?: string;
    };
    created_at: string;
    updated_at: string;
}

export const CUSTOM_AIRCRAFT_STORAGE_KEY = "adcs-sim.custom-aircraft.v1";

export function makeCustomAircraftId(): string {
    if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
        return `custom-${crypto.randomUUID()}`;
    }
    return `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function makeDefaultCustomAircraft(): CustomAircraftDefinition {
    const now = new Date().toISOString();
    return {
        id: makeCustomAircraftId(),
        name: "My Research Aircraft",
        classification: "custom",
        stability_mode: "stable",
        geometry: {
            wing_area: 16.2,
            wingspan: 11,
            mean_aerodynamic_chord: 1.5,
            tail_arm: 4.5,
            cg_location: 0.3,
        },
        inertia: {
            mass: 1100,
            Ixx: 1285,
            Iyy: 1824,
            Izz: 2666,
            Ixz: 0,
        },
        aero: {
            Xu: -0.03,
            Xw: 0,
            Zu: -0.4,
            Zw: -5.5,
            Mu: 0,
            Mw: -0.8,
            Mq: -10,
            Yv: -0.3,
            Lv: -0.1,
            Lp: -2.7,
            Nr: -0.35,
        },
        params: {
            rho_kgm3: 1.225,
            max_thrust_N: 4000,
            CL0: 0.25,
            CL_alpha_per_rad: 4.5,
            CL_q: 8.5,
            CL_de_per_rad: 0.4,
            CD0: 0.025,
            CD_k: 0.053,
            Cm0: 0,
            Cm_alpha_per_rad: -0.8,
            Cm_q_per_rad: -10,
            Cm_de_per_rad: -1.2,
            CY_beta_per_rad: -0.3,
            CY_dr_per_rad: 0.15,
            Cl_beta_per_rad: -0.1,
            Cl_p: -2.7,
            Cl_r: 0.15,
            Cl_da_per_rad: 0.2,
            Cl_dr_per_rad: 0.01,
            Cn_beta_per_rad: 0.15,
            Cn_p: -0.05,
            Cn_r: -0.35,
            Cn_da_per_rad: -0.02,
            Cn_dr_per_rad: -0.08,
        },
        limits: {
            elevator_max_rad: 0.4363323129985824,
            aileron_max_rad: 0.3490658503988659,
            rudder_max_rad: 0.5235987755982988,
        },
        metadata: {
            source: "Custom user-defined configuration",
            notes: "Editable local workbench aircraft",
        },
        created_at: now,
        updated_at: now,
    };
}

export function loadCustomAircraftRegistry(): CustomAircraftDefinition[] {
    if (typeof window === "undefined") return [];
    try {
        const raw = window.localStorage.getItem(CUSTOM_AIRCRAFT_STORAGE_KEY);
        if (!raw) return [];
        const parsed = JSON.parse(raw) as CustomAircraftDefinition[];
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

export function saveCustomAircraftRegistry(items: CustomAircraftDefinition[]) {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(CUSTOM_AIRCRAFT_STORAGE_KEY, JSON.stringify(items));
}

export function upsertAircraft(definition: CustomAircraftDefinition): CustomAircraftDefinition[] {
    const registry = loadCustomAircraftRegistry();
    const now = new Date().toISOString();
    const index = registry.findIndex((item) => item.id === definition.id);
    const nextRecord = {
        ...definition,
        updated_at: now,
    };
    if (index === -1) {
        registry.push({
            ...nextRecord,
            created_at: definition.created_at || now,
        });
    } else {
        registry[index] = {
            ...nextRecord,
            created_at: registry[index].created_at,
        };
    }
    saveCustomAircraftRegistry(registry);
    return registry;
}

export function deleteAircraft(id: string): CustomAircraftDefinition[] {
    const updated = loadCustomAircraftRegistry().filter((item) => item.id !== id);
    saveCustomAircraftRegistry(updated);
    return updated;
}

export function duplicateAircraft(id: string): CustomAircraftDefinition[] {
    const registry = loadCustomAircraftRegistry();
    const source = registry.find((item) => item.id === id);
    if (!source) return registry;
    const now = new Date().toISOString();
    const copy: CustomAircraftDefinition = {
        ...JSON.parse(JSON.stringify(source)) as CustomAircraftDefinition,
        id: makeCustomAircraftId(),
        name: `Copy of ${source.name}`,
        created_at: now,
        updated_at: now,
    };
    registry.push(copy);
    saveCustomAircraftRegistry(registry);
    return registry;
}

export function validateCustomAircraft(definition: CustomAircraftDefinition): string[] {
    const errors: string[] = [];
    const positiveChecks: Array<[string, number]> = [
        ["Mass", definition.inertia.mass],
        ["Wing area", definition.geometry.wing_area],
        ["Wingspan", definition.geometry.wingspan],
        ["Mean aerodynamic chord", definition.geometry.mean_aerodynamic_chord],
        ["Tail arm", definition.geometry.tail_arm],
        ["Ixx", definition.inertia.Ixx],
        ["Iyy", definition.inertia.Iyy],
        ["Izz", definition.inertia.Izz],
        ["Density", definition.params.rho_kgm3],
        ["Max thrust", definition.params.max_thrust_N],
    ];
    for (const [label, value] of positiveChecks) {
        if (!(Number.isFinite(value) && value > 0)) errors.push(`${label} must be positive.`);
    }
    if (definition.geometry.cg_location < 0 || definition.geometry.cg_location > 1) {
        errors.push("CG location must be within [0, 1].");
    }
    if (Math.abs(definition.params.Cm_de_per_rad) < 1e-9) {
        errors.push("Cm_de_per_rad must be nonzero - elevator has no pitch authority.");
    }
    if (Math.abs(definition.aero.Mq) < 1e-9) errors.push("Mq must be nonzero for useful pitch damping.");
    if (Math.abs(definition.aero.Lp) < 1e-9) errors.push("Lp must be nonzero for roll damping.");
    if (Math.abs(definition.aero.Nr) < 1e-9) errors.push("Nr must be nonzero for yaw damping.");
    if (!definition.name.trim()) errors.push("Aircraft name is required.");
    return errors;
}
