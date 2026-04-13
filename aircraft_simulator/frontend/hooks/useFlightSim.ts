"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { resolveWsBase } from "@/lib/api";

// ── Types ────────────────────────────────────────────────────────────────────

export interface FlightState {
    x: number;
    y: number;
    z: number;
    phi: number;
    theta: number;
    psi: number;
    u: number;
    v: number;
    w: number;
    altitude_m: number;
    time: number;
}

export interface FlightPacket {
    t: number;
    truth: {
        x: number;
        y: number;
        z: number;
        altitude_m: number;
        phi: number;
        theta: number;
        psi: number;
        u: number;
        v: number;
        w: number;
    };
    controls: {
        cmd: { throttle: number; aileron: number; elevator: number; rudder: number };
        act: { throttle: number; aileron: number; elevator: number; rudder: number };
    };
    targets: { V: number; alt: number; hdg_deg: number };
    wind_ned: { n: number; e: number; d: number };
    meas: Record<string, number | null>;
    ap: Record<string, number>;
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "reconnecting";

const MAX_HISTORY = 2000;
const RECONNECT_BASE_MS = 500;
const RECONNECT_MAX_MS = 5000;

// ── Hook ─────────────────────────────────────────────────────────────────────

export function useFlightSim() {
    const ws = useRef<WebSocket | null>(null);
    const [state, setState] = useState<FlightState | null>(null);
    const [packet, setPacket] = useState<FlightPacket | null>(null);
    const [status, setStatus] = useState<ConnectionStatus>("disconnected");
    const historyRef = useRef<FlightState[]>([]);
    const reconnectAttempt = useRef(0);
    const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const mountedRef = useRef(true);

    const connect = useCallback(() => {
        if (!mountedRef.current) return;

        const wsUrl = `${resolveWsBase()}/ws`;
        setStatus("connecting");

        const socket = new WebSocket(wsUrl);
        ws.current = socket;

        socket.onopen = () => {
            if (!mountedRef.current) { socket.close(); return; }
            setStatus("connected");
            reconnectAttempt.current = 0;
        };

        socket.onmessage = (e) => {
            if (!mountedRef.current) return;
            try {
                const pkt = JSON.parse(e.data) as FlightPacket;
                const t = pkt.truth;
                const fs: FlightState = {
                    x: t.x,
                    y: t.y,
                    z: t.z,
                    phi: t.phi,
                    theta: t.theta,
                    psi: t.psi,
                    u: t.u,
                    v: t.v,
                    w: t.w,
                    altitude_m: t.altitude_m,
                    time: pkt.t,
                };
                setState(fs);
                setPacket(pkt);
                historyRef.current.push(fs);
                if (historyRef.current.length > MAX_HISTORY) {
                    historyRef.current.shift();
                }
            } catch {
                // malformed packet — skip
            }
        };

        socket.onclose = () => {
            if (!mountedRef.current) return;
            ws.current = null;
            setStatus("reconnecting");
            scheduleReconnect();
        };

        socket.onerror = () => {
            // onclose fires after onerror, reconnect handled there
        };
    }, []);

    const scheduleReconnect = useCallback(() => {
        if (!mountedRef.current) return;
        const delay = Math.min(
            RECONNECT_BASE_MS * Math.pow(2, reconnectAttempt.current),
            RECONNECT_MAX_MS,
        );
        reconnectAttempt.current += 1;
        reconnectTimer.current = setTimeout(() => {
            if (mountedRef.current) connect();
        }, delay);
    }, [connect]);

    useEffect(() => {
        mountedRef.current = true;
        connect();
        return () => {
            mountedRef.current = false;
            if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
            ws.current?.close();
            ws.current = null;
        };
    }, [connect]);

    const sendCommand = useCallback((cmd: object) => {
        if (ws.current?.readyState === WebSocket.OPEN) {
            ws.current.send(JSON.stringify(cmd));
        }
    }, []);

    return {
        state,
        packet,
        status,
        connected: status === "connected",
        history: historyRef.current,
        sendCommand,
    };
}
