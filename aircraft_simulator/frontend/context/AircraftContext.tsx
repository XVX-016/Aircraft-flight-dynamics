"use client";

import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { AircraftSelectionRef, FlightCondition } from "@/lib/api";
import { buildAircraftRequest, buildFlightConditionRequest, postJSON } from "@/lib/api";
import type { CustomAircraftDefinition, StabilityMode } from "@/lib/customAircraft";
import { deleteAircraft, duplicateAircraft, loadCustomAircraftRegistry, saveCustomAircraftRegistry, upsertAircraft } from "@/lib/customAircraft";

export type Eig = { real: number; imag: number };

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

export interface ComputedState {
    A?: number[][];
    B?: number[][];
    eigenvalues?: Eig[];
    modalAnalysis?: {
        spectral_margin: number;
        min_damping_ratio: number | null;
        unstable_modes: number;
        neutral_modes: number;
        modes: {
            type: string;
            family: string;
            eigenvalue_real: number;
            eigenvalue_imag: number;
            wn: number | null;
            zeta: number | null;
            stable: boolean;
        }[];
    };
    trim?: {
        x0: number[];
        u0: number[];
        alpha_rad: number;
        theta_rad?: number;
        throttle: number;
        elevator_rad: number;
        residual_norm: number;
        solver_success?: boolean;
        solver_nfev?: number;
    };
    metrics?: Record<string, number | null>;
}

interface CacheEntry {
    key: string;
    data: Record<string, unknown>;
}

interface AnalysisCache {
    trim?: CacheEntry;
    linearization?: CacheEntry;
    control?: CacheEntry;
    stepResponse?: CacheEntry;
    estimation?: CacheEntry;
    validation?: CacheEntry;
    frequencyResponse?: CacheEntry;
    modeShapes?: CacheEntry;
}

export interface AircraftContextState {
    selectedAircraftRef: AircraftSelectionRef | null;
    selectedAircraftId: string | null;
    selectedAircraftKind: "built_in" | "custom" | null;
    selectedCustomAircraft: CustomAircraftDefinition | null;
    customAircraftRegistry: CustomAircraftDefinition[];
    metadata: {
        name: string;
        classification: string;
        stabilityMode: StabilityMode;
    } | null;
    flightCondition: FlightCondition;
    currentAnalysisKey: string | null;
    computed: ComputedState;
    analysisCache: AnalysisCache;
    validation: {
        backendCapable: boolean;
        warnings: string[];
    };
    loading: boolean;
    error: string | null;
}

interface AircraftContextValue extends AircraftContextState {
    aircraftData: AircraftData | null;
    setAircraft: (id: string, fc?: Partial<FlightCondition>) => Promise<void>;
    selectCustomAircraft: (id: string, fc?: Partial<FlightCondition>) => Promise<void>;
    saveCustomAircraft: (aircraft: CustomAircraftDefinition) => void;
    deleteCustomAircraft: (id: string) => void;
    duplicateCustomAircraft: (id: string) => void;
    exportCustomAircraft: (id: string) => string | null;
    getCachedAnalysis: (cacheKey: keyof AnalysisCache) => Record<string, unknown> | undefined;
    setFlightCondition: (fc: Partial<FlightCondition>) => Promise<void>;
    refreshCoreAnalysis: () => Promise<void>;
    runControlAnalysis: (weights?: Record<string, number>) => Promise<Record<string, unknown>>;
    runStepResponse: (options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    runEstimation: (options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    runValidation: (options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    runFrequencyResponse: (options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
    runModeShapes: (options?: Record<string, unknown>) => Promise<Record<string, unknown>>;
}

const AircraftContext = createContext<AircraftContextValue | null>(null);

const INITIAL_STATE: AircraftContextState = {
    selectedAircraftRef: null,
    selectedAircraftId: null,
    selectedAircraftKind: null,
    selectedCustomAircraft: null,
    customAircraftRegistry: [],
    metadata: null,
    flightCondition: { altitude: 1000, velocity: 60, isaTempOffsetC: 0, headwind: 0, crosswind: 0 },
    currentAnalysisKey: null,
    computed: {},
    analysisCache: {},
    validation: { backendCapable: false, warnings: [] },
    loading: false,
    error: null,
};

function makeAnalysisKey(selection: AircraftSelectionRef | null, flightCondition: FlightCondition): string | null {
    if (!selection) return null;
    return JSON.stringify({ ref: selection, condition: flightCondition });
}

export function AircraftProvider({ children }: { children: React.ReactNode }) {
    const [state, setState] = useState<AircraftContextState>(INITIAL_STATE);
    const [aircraftData, setAircraftData] = useState<AircraftData | null>(null);

    useEffect(() => {
        const registry = loadCustomAircraftRegistry();
        setState((prev) => ({ ...prev, customAircraftRegistry: registry }));
    }, []);

    const persistRegistry = useCallback((items: CustomAircraftDefinition[]) => {
        saveCustomAircraftRegistry(items);
        setState((prev) => ({ ...prev, customAircraftRegistry: items }));
    }, []);

    const resolveSelectionPayload = useCallback((selection: AircraftSelectionRef | null, customAircraft: CustomAircraftDefinition | null, fc: FlightCondition) => {
        return {
            ...buildAircraftRequest(selection, customAircraft),
            ...buildFlightConditionRequest(fc),
        };
    }, []);

    const loadAnalysis = useCallback(async (selection: AircraftSelectionRef, customAircraft: CustomAircraftDefinition | null, fc: FlightCondition) => {
        const body = resolveSelectionPayload(selection, customAircraft, fc);
        const selectPath = selection.kind === "custom" ? "/api/v1/aircraft/custom/analyze" : "/api/v1/aircraft/select";
        const selected = await postJSON<Record<string, unknown>>(selectPath, body);
        const trim = await postJSON<Record<string, unknown>>("/api/v1/analysis/trim", body);
        const linearize = await postJSON<Record<string, unknown>>("/api/v1/analysis/linearize", body);
        return { selected, trim, linearize };
    }, [resolveSelectionPayload]);

    const applyAnalysis = useCallback((selection: AircraftSelectionRef, customAircraft: CustomAircraftDefinition | null, fc: FlightCondition, selected: Record<string, unknown>, trim: Record<string, unknown>, linearize: Record<string, unknown>) => {
        const selectedAircraft = selected.selected_aircraft as { id: string; name: string; classification: string; stability_mode: StabilityMode } | undefined;
        const analysisKey = makeAnalysisKey(selection, fc);
        setAircraftData({
            geometry: selected.geometry as AircraftData["geometry"],
            inertia: selected.inertia as AircraftData["inertia"],
            aero: selected.aero as AircraftData["aero"],
            metadata: selected.metadata as AircraftData["metadata"],
        });
        setState((prev) => ({
            ...prev,
            selectedAircraftRef: selection,
            selectedAircraftId: selection.id,
            selectedAircraftKind: selection.kind,
            selectedCustomAircraft: customAircraft,
            metadata: selectedAircraft ? {
                name: selectedAircraft.name,
                classification: selectedAircraft.classification,
                stabilityMode: selectedAircraft.stability_mode,
            } : prev.metadata,
            flightCondition: fc,
            currentAnalysisKey: analysisKey,
            computed: {
                A: linearize.A as number[][],
                B: linearize.B as number[][],
                eigenvalues: linearize.eigenvalues as Eig[],
                modalAnalysis: linearize.modal_analysis as AircraftContextState["computed"]["modalAnalysis"],
                trim: {
                    ...(trim as object),
                    ...(linearize.trim as object),
                } as AircraftContextState["computed"]["trim"],
                metrics: (linearize.metrics ?? selected.computed_metrics ?? {}) as Record<string, number | null>,
            },
            analysisCache: analysisKey ? {
                trim: { key: analysisKey, data: trim },
                linearization: { key: analysisKey, data: linearize },
            } : {},
            validation: { backendCapable: true, warnings: [] },
            loading: false,
            error: null,
        }));
    }, []);

    const hydrateSelection = useCallback(async (selection: AircraftSelectionRef, fc?: Partial<FlightCondition>) => {
        const activeCondition = { ...state.flightCondition, ...(fc ?? {}) };
        const customAircraft = selection.kind === "custom"
            ? state.customAircraftRegistry.find((item) => item.id === selection.id) ?? null
            : null;
        setState((prev) => ({ ...prev, loading: true, error: null }));
        setAircraftData(null);
        try {
            const { selected, trim, linearize } = await loadAnalysis(selection, customAircraft, activeCondition);
            applyAnalysis(selection, customAircraft, activeCondition, selected, trim, linearize);
        } catch (err) {
            const message = err instanceof Error ? err.message : "Backend unavailable";
            setState((prev) => ({
                ...prev,
                loading: false,
                error: message,
                validation: { backendCapable: false, warnings: [message] },
            }));
        }
    }, [applyAnalysis, loadAnalysis, state.customAircraftRegistry, state.flightCondition]);

    const setAircraft = useCallback(async (id: string, fc?: Partial<FlightCondition>) => {
        await hydrateSelection({ kind: "built_in", id }, fc);
    }, [hydrateSelection]);

    const selectCustomAircraft = useCallback(async (id: string, fc?: Partial<FlightCondition>) => {
        await hydrateSelection({ kind: "custom", id }, fc);
    }, [hydrateSelection]);

    const saveCustomAircraft = useCallback((aircraft: CustomAircraftDefinition) => {
        const updated = upsertAircraft(aircraft).sort((a, b) => a.name.localeCompare(b.name));
        persistRegistry(updated);
    }, [persistRegistry]);

    const deleteCustomAircraft = useCallback((id: string) => {
        const updated = deleteAircraft(id);
        persistRegistry(updated);
        if (state.selectedAircraftRef?.kind === "custom" && state.selectedAircraftRef.id === id) {
            setState((prev) => ({ ...prev, selectedAircraftRef: null, selectedAircraftId: null, selectedAircraftKind: null, selectedCustomAircraft: null, metadata: null, currentAnalysisKey: null, computed: {}, analysisCache: {} }));
            setAircraftData(null);
        }
    }, [persistRegistry, state.selectedAircraftRef]);

    const duplicateCustomAircraft = useCallback((id: string) => {
        const updated = duplicateAircraft(id);
        persistRegistry(updated);
    }, [persistRegistry]);

    const exportCustomAircraft = useCallback((id: string) => {
        const source = state.customAircraftRegistry.find((item) => item.id === id);
        return source ? JSON.stringify(source, null, 2) : null;
    }, [state.customAircraftRegistry]);

    const getCachedAnalysis = useCallback((cacheKey: keyof AnalysisCache) => {
        const entry = state.analysisCache[cacheKey];
        if (!entry || !state.currentAnalysisKey || entry.key !== state.currentAnalysisKey) return undefined;
        return entry.data;
    }, [state.analysisCache, state.currentAnalysisKey]);

    const setFlightCondition = useCallback(async (fc: Partial<FlightCondition>) => {
        const next = { ...state.flightCondition, ...fc };
        setState((prev) => ({ ...prev, flightCondition: next }));
        if (!state.selectedAircraftRef) return;
        await hydrateSelection(state.selectedAircraftRef, next);
    }, [hydrateSelection, state.flightCondition, state.selectedAircraftRef]);

    const refreshCoreAnalysis = useCallback(async () => {
        if (!state.selectedAircraftRef) return;
        await hydrateSelection(state.selectedAircraftRef);
    }, [hydrateSelection, state.selectedAircraftRef]);

    const makeRunner = useCallback((path: string, cacheKey: keyof AnalysisCache) => {
        return async (options: Record<string, unknown> = {}) => {
            if (!state.selectedAircraftRef) throw new Error("No aircraft selected.");
            const activeKey = state.currentAnalysisKey ?? makeAnalysisKey(state.selectedAircraftRef, state.flightCondition);
            const body = {
                ...resolveSelectionPayload(state.selectedAircraftRef, state.selectedCustomAircraft, state.flightCondition),
                ...options,
            };
            const data = await postJSON<Record<string, unknown>>(path, body);
            setState((prev) => ({
                ...prev,
                analysisCache: activeKey ? { ...prev.analysisCache, [cacheKey]: { key: activeKey, data } } : prev.analysisCache,
            }));
            return data;
        };
    }, [resolveSelectionPayload, state.currentAnalysisKey, state.flightCondition, state.selectedAircraftRef, state.selectedCustomAircraft]);

    const value = useMemo<AircraftContextValue>(() => ({
        ...state,
        aircraftData,
        setAircraft,
        selectCustomAircraft,
        saveCustomAircraft,
        deleteCustomAircraft,
        duplicateCustomAircraft,
        exportCustomAircraft,
        getCachedAnalysis,
        setFlightCondition,
        refreshCoreAnalysis,
        runControlAnalysis: makeRunner("/api/v1/analysis/control", "control"),
        runStepResponse: makeRunner("/api/v1/analysis/step-response", "stepResponse"),
        runEstimation: makeRunner("/api/v1/estimation/run", "estimation"),
        runValidation: makeRunner("/api/v1/validation/run", "validation"),
        runFrequencyResponse: makeRunner("/api/v1/analysis/frequency-response", "frequencyResponse"),
        runModeShapes: makeRunner("/api/v1/analysis/mode-shapes", "modeShapes"),
    }), [aircraftData, deleteCustomAircraft, duplicateCustomAircraft, exportCustomAircraft, getCachedAnalysis, makeRunner, refreshCoreAnalysis, saveCustomAircraft, selectCustomAircraft, setAircraft, setFlightCondition, state]);

    return <AircraftContext.Provider value={value}>{children}</AircraftContext.Provider>;
}

export function useAircraftContext(): AircraftContextValue {
    const ctx = useContext(AircraftContext);
    if (!ctx) throw new Error("useAircraftContext must be used within <AircraftProvider>");
    return ctx;
}
