"use client";

/**
 * SimProvider - Thin React Glue for SimCore
 * 
 * Responsibilities:
 *  - Own ONE SimCore instance (singleton lifetime within React tree).
 *  - Advance simulation time via useFrame or rAF.
 *  - Expose READ-ONLY snapshots via context.
 * 
 * This provider MUST NOT:
 *  - Compute any physics (that's SimCore's job).
 *  - Touch EKF internals.
 *  - Know about specific pages.
 */
import React, { createContext, useContext, useRef, useEffect, useState, ReactNode } from "react";
import { simulationEngine, SimulationEngine } from "@/lib/simulation/simulation-engine";
import { TruthState } from "@/lib/simulation/types/state";
import { ControlInput } from "@/lib/simulation/types/control";
import { derivePhysics, DerivedPhysics } from "@/lib/simulation/derived-physics";
import { AutopilotMode } from "@/core/control/autopilot";

// --- Context Shape ---
interface SimContextValue {
    // State Snapshots (Read-Only)
    truthState: TruthState | null;
    derived: DerivedPhysics | null;
    estimate: { state: number[], covariance: number[][] } | null;
    time: number;

    // Simulation Controls
    isRunning: boolean;
    play: () => void;
    pause: () => void;
    step: () => void;
    reset: () => void;

    // Input Commands (Write)
    setControls: (controls: Partial<ControlInput>) => void;

    // Autopilot
    autopilotMode: AutopilotMode;
    setAutopilotMode: (mode: AutopilotMode) => void;
    setAutopilotTargets: (targets: { altitude?: number, heading?: number, speed?: number }) => void;
}

const SimContext = createContext<SimContextValue | null>(null);

// --- Hook ---
export function useSim(): SimContextValue {
    const ctx = useContext(SimContext);
    if (!ctx) {
        throw new Error("useSim must be used within <SimProvider>");
    }
    return ctx;
}

// --- Provider ---
interface SimProviderProps {
    children: ReactNode;
}

export function SimProvider({ children }: SimProviderProps) {
    const engineRef = useRef<SimulationEngine>(simulationEngine);
    const [isRunning, setIsRunning] = useState(true);
    const [truthState, setTruthState] = useState<TruthState | null>(null);
    const [derived, setDerived] = useState<DerivedPhysics | null>(null);
    const [estimate, setEstimate] = useState<{ state: number[], covariance: number[][] } | null>(null);
    const [time, setTime] = useState(0);
    const [autopilotMode, setAutopilotModeState] = useState<AutopilotMode>(AutopilotMode.OFF);

    // --- Simulation Loop ---
    useEffect(() => {
        let animationFrameId: number;
        let lastTime = performance.now();

        const loop = (now: number) => {
            if (isRunning) {
                const dt = (now - lastTime) / 1000;
                lastTime = now;

                // Accumulator for fixed timestep
                let accumulatedTime = dt;
                const fixedDt = 0.01; // 100Hz physics

                while (accumulatedTime >= fixedDt) {
                    engineRef.current.update(fixedDt);
                    accumulatedTime -= fixedDt;
                }

                // Get latest state snapshot
                const state = engineRef.current.getRenderState(now);
                const fullState = engineRef.current['engine'].getState(); // Direct access hack for consistency or expose properly
                // Actually simulationEngine.getState() on core returns { estimate }
                // But wrapper .getRenderState returns TruthState.
                // We need to expose getCoreState in wrapper.

                setTruthState(state);
                setDerived(derivePhysics(state));
                setEstimate(fullState.estimate);
                setTime(fullState.time);

                // Sync Autopilot Mode UI
                setAutopilotModeState(engineRef.current.getAutopilotState().mode);
            }

            animationFrameId = requestAnimationFrame(loop);
        };

        animationFrameId = requestAnimationFrame(loop);

        return () => cancelAnimationFrame(animationFrameId);
    }, [isRunning]);

    // --- Controls ---
    const play = () => setIsRunning(true);
    const pause = () => setIsRunning(false);
    const step = () => {
        engineRef.current.update(0.01);
        const state = engineRef.current.getRenderState(performance.now());
        const fullState = engineRef.current['engine'].getState();
        setTruthState(state);
        setDerived(derivePhysics(state));
        setEstimate(fullState.estimate);
        setTime(fullState.time);
    };
    const reset = () => {
        console.warn("SimProvider.reset() - Not yet implemented");
    };
    const setControls = (controls: Partial<ControlInput>) => {
        engineRef.current.setControls(controls);
    };

    const setAutopilotMode = (mode: AutopilotMode) => {
        engineRef.current.setAutopilotMode(mode);
        setAutopilotModeState(mode);
    };

    const setAutopilotTargets = (targets: { altitude?: number, heading?: number, speed?: number }) => {
        engineRef.current.setAutopilotTargets(targets);
    };

    const value: SimContextValue = {
        truthState,
        derived,
        estimate,
        time,
        isRunning,
        play,
        pause,
        step,
        reset,
        setControls,
        autopilotMode,
        setAutopilotMode,
        setAutopilotTargets
    };

    return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}
