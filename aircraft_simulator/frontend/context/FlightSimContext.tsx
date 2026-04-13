"use client";

import React, { createContext, useContext } from "react";
import { useFlightSim, type FlightState, type FlightPacket } from "@/hooks/useFlightSim";

// ── Context type ─────────────────────────────────────────────────────────────

interface FlightSimContextValue {
    /** Latest telemetry state (null before first packet) */
    state: FlightState | null;
    /** Full raw packet from the backend */
    packet: FlightPacket | null;
    /** WebSocket connection status */
    status: "disconnected" | "connecting" | "connected" | "reconnecting";
    /** Shorthand for status === "connected" */
    connected: boolean;
    /** Ring buffer of recent states for trail rendering and charts */
    history: FlightState[];
    /** Send a command object to the backend via WebSocket */
    sendCommand: (cmd: object) => void;
}

const FlightSimContext = createContext<FlightSimContextValue | null>(null);

// ── Provider ─────────────────────────────────────────────────────────────────

export function FlightSimProvider({ children }: { children: React.ReactNode }) {
    const sim = useFlightSim();

    return (
        <FlightSimContext.Provider value={sim}>
            {children}
        </FlightSimContext.Provider>
    );
}

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useFlightSimContext(): FlightSimContextValue {
    const ctx = useContext(FlightSimContext);
    if (!ctx) {
        throw new Error("useFlightSimContext must be used within <FlightSimProvider>");
    }
    return ctx;
}
