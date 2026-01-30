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

// --- Context Shape ---
interface SimContextValue {
    // State Snapshots (Read-Only)
    truthState: TruthState | null;
    derived: DerivedPhysics | null;

    // Simulation Controls
    isRunning: boolean;
    play: () => void;
    pause: () => void;
    step: () => void;
    reset: () => void;

    // Input Commands (Write)
    setControls: (controls: Partial<ControlInput>) => void;
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
                setTruthState(state);
                setDerived(derivePhysics(state));
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
        setTruthState(state);
        setDerived(derivePhysics(state));
    };
    const reset = () => {
        // Re-initialize the engine (would need a reset method on SimulationEngine)
        // For now, just log
        console.warn("SimProvider.reset() - Not yet implemented on SimulationEngine");
    };
    const setControls = (controls: Partial<ControlInput>) => {
        engineRef.current.setControls(controls);
    };

    const value: SimContextValue = {
        truthState,
        derived,
        isRunning,
        play,
        pause,
        step,
        reset,
        setControls
    };

    return <SimContext.Provider value={value}>{children}</SimContext.Provider>;
}
