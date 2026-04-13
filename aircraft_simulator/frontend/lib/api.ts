import type { CustomAircraftDefinition } from "@/lib/customAircraft";

const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
const API_BASE = configuredApiBase ? configuredApiBase.replace(/\/+$/, "") : "";

export function resolveApiBase() {
    if (API_BASE) return API_BASE;
    if (typeof window !== "undefined") {
        const host = window.location.hostname;
        if (host === "localhost" || host === "127.0.0.1") {
            return "http://localhost:8000";
        }
    }
    return "";
}

export function apiUrl(path: string) {
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const base = resolveApiBase();
    return base ? `${base}${normalizedPath}` : normalizedPath;
}

export async function postJSON<T>(path: string, body: Record<string, unknown>): Promise<T> {
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
    const data = await res.json() as T & { error?: string };
    if (data && typeof data === "object" && data.error) {
        throw new Error(data.error);
    }
    return data;
}

export interface FlightCondition {
    velocity: number;
    altitude: number;
    isaTempOffsetC: number;
    headwind: number;
    crosswind: number;
}

export type AircraftSelectionRef =
    | { kind: "built_in"; id: string }
    | { kind: "custom"; id: string };

export function buildFlightConditionRequest(flightCondition: FlightCondition) {
    return {
        V_mps: flightCondition.velocity,
        altitude_m: flightCondition.altitude,
        isa_temp_offset_c: flightCondition.isaTempOffsetC,
        headwind_mps: flightCondition.headwind,
        crosswind_mps: flightCondition.crosswind,
    };
}

export function buildAircraftRequest(selection: AircraftSelectionRef | null, customAircraft: CustomAircraftDefinition | null) {
    if (selection?.kind === "custom" && customAircraft) {
        return { custom_aircraft: customAircraft };
    }
    if (selection?.kind === "built_in") {
        return { aircraft_id: selection.id };
    }
    return {};
}

export function resolveWsBase(): string {
    const http = resolveApiBase();
    if (!http) return "ws://localhost:8000";
    return http.replace(/^https/, "wss").replace(/^http/, "ws");
}
