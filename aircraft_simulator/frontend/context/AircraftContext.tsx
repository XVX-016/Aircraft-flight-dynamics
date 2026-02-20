"use client";

import React, { createContext, useCallback, useContext, useMemo, useState } from "react";

export type StabilityMode = "stable" | "relaxed" | "unstable";

export interface AircraftContextState {
    selectedAircraftId: string | null;
    metadata: {
        name: string;
        classification: string;
        stabilityMode: StabilityMode;
    } | null;
    flightCondition: {
        altitude: number;
        velocity: number;
    };
    computed: {
        A?: number[][];
        B?: number[][];
        eigenvalues?: { real: number; imag: number }[];
        trim?: {
            x0: number[];
            u0: number[];
            alpha_rad: number;
            throttle: number;
            elevator_rad: number;
            residual_norm: number;
        };
    };
    validation: {
        backendCapable: boolean;
        warnings: string[];
    };
    loading: boolean;
    error: string | null;
}

export interface AircraftData {
    geometry: {
        wingArea: number;
        wingspan: number;
        meanAerodynamicChord: number;
        tailArm: number;
        cgLocation: number;
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
    metadata: {
        source: string;
        notes?: string;
    };
}

interface AircraftContextValue extends AircraftContextState {
    aircraftData: AircraftData | null;
    setAircraft: (id: string, fc?: { velocity: number; altitude: number }) => Promise<void>;
    setFlightCondition: (fc: { altitude?: number; velocity?: number }) => Promise<void>;
}

const AircraftContext = createContext<AircraftContextValue | null>(null);

const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
const API_BASE = configuredApiBase ? configuredApiBase.replace(/\/+$/, "") : "";

function apiUrl(path: string) {
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return API_BASE ? `${API_BASE}${normalizedPath}` : normalizedPath;
}

async function postJSON<T>(path: string, body: Record<string, unknown>): Promise<T> {
    let res: Response;
    try {
        res = await fetch(apiUrl(path), {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
        });
    } catch {
        throw new Error("Backend unavailable. Configure NEXT_PUBLIC_API_BASE for production.");
    }
    if (!res.ok) {
        const text = await res.text();
        if (text && text.toLowerCase().includes("<html")) {
            throw new Error("Backend unavailable");
        }
        throw new Error(text || `Request failed: ${res.status}`);
    }
    const contentType = res.headers.get("content-type") || "";
    if (!contentType.includes("application/json")) {
        await res.text();
        throw new Error("Backend unavailable");
    }
    const data = await res.json() as T;
    const maybeError = data as { error?: string };
    if (data && typeof data === "object" && maybeError.error) {
        throw new Error(maybeError.error);
    }
    return data;
}

const INITIAL_STATE: AircraftContextState = {
    selectedAircraftId: null,
    metadata: null,
    flightCondition: { altitude: 1000, velocity: 60 },
    computed: {},
    validation: { backendCapable: false, warnings: [] },
    loading: false,
    error: null,
};

export function AircraftProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AircraftContextState>(INITIAL_STATE);
    const [aircraftData, setAircraftData] = useState<AircraftData | null>(null);

    const setAircraft = useCallback(async (id: string, fc?: { velocity: number; altitude: number }) => {
        const activeCondition = fc ?? state.flightCondition;
        setState((prev) => ({
            ...prev,
            loading: true,
            error: null,
            computed: {},
            validation: { backendCapable: false, warnings: [] },
        }));
        setAircraftData(null);

        try {
            const selected = await postJSON<{
                selected_aircraft: { id: string; name: string; classification: string; stability_mode: StabilityMode };
                geometry: AircraftData["geometry"];
                inertia: AircraftData["inertia"];
                aero: AircraftData["aero"];
                metadata: AircraftData["metadata"];
            }>("/api/v1/aircraft/select", { aircraft_id: id });

            const trim = await postJSON<{
                x0: number[];
                u0: number[];
                alpha_rad: number;
                throttle: number;
                elevator_rad: number;
                residual_norm: number;
            }>("/api/v1/analysis/trim", { V_mps: activeCondition.velocity });

            const linearize = await postJSON<{
                A: number[][];
                B: number[][];
                eigenvalues: { real: number; imag: number }[];
                trim: {
                    x0: number[];
                    u0: number[];
                    alpha_rad: number;
                    throttle: number;
                    elevator_rad: number;
                    residual_norm: number;
                };
            }>("/api/v1/analysis/linearize", { V_mps: activeCondition.velocity });

            setAircraftData({
                geometry: selected.geometry,
                inertia: selected.inertia,
                aero: selected.aero,
                metadata: selected.metadata,
            });

            setState({
                selectedAircraftId: selected.selected_aircraft.id,
                metadata: {
                    name: selected.selected_aircraft.name,
                    classification: selected.selected_aircraft.classification,
                    stabilityMode: selected.selected_aircraft.stability_mode,
                },
                flightCondition: { ...activeCondition },
                computed: {
                    A: linearize.A,
                    B: linearize.B,
                    eigenvalues: linearize.eigenvalues,
                    trim: linearize.trim ?? trim,
                },
                validation: { backendCapable: true, warnings: [] },
                loading: false,
                error: null,
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : "Backend unavailable";
            setState((prev) => ({
                ...prev,
                selectedAircraftId: null,
                metadata: null,
                computed: {},
                validation: { backendCapable: false, warnings: [message] },
                loading: false,
                error: message,
            }));
            setAircraftData(null);
        }
    }, [state.flightCondition]);

    const setFlightCondition = useCallback(async (fc: { altitude?: number; velocity?: number }) => {
        const next = {
            altitude: fc.altitude ?? state.flightCondition.altitude,
            velocity: fc.velocity ?? state.flightCondition.velocity,
        };
        setState((prev) => ({
            ...prev,
            flightCondition: next,
        }));
        if (!state.selectedAircraftId) return;
        await setAircraft(state.selectedAircraftId, next);
    }, [setAircraft, state.flightCondition, state.selectedAircraftId]);

    const value = useMemo<AircraftContextValue>(() => ({
        ...state,
        aircraftData,
        setAircraft,
        setFlightCondition,
    }), [state, aircraftData, setAircraft, setFlightCondition]);

    return <AircraftContext.Provider value={value}>{children}</AircraftContext.Provider>;
}

export function useAircraftContext(): AircraftContextValue {
    const ctx = useContext(AircraftContext);
    if (!ctx) throw new Error("useAircraftContext must be used within <AircraftProvider>");
    return ctx;
}


