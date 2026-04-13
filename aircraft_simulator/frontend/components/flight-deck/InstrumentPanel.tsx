"use client";

import { useCallback, useMemo, useState } from "react";
import {
    LineChart,
    Line,
    YAxis,
    XAxis,
    ReferenceLine,
    ResponsiveContainer,
} from "recharts";
import type { FlightState } from "@/hooks/useFlightSim";

// ── Types ────────────────────────────────────────────────────────────────────

interface InstrumentPanelProps {
    state: FlightState | null;
    history: FlightState[];
    sendCommand: (cmd: object) => void;
    connected: boolean;
}

// ── Scenario presets ─────────────────────────────────────────────────────────

interface ScenarioConfig {
    targets: { V?: number; alt?: number; hdg_deg?: number };
    wind: { n: number; e: number; d: number };
    autopilot?: boolean;
}

const SCENARIOS: Record<string, ScenarioConfig> = {
    "Straight & Level": {
        targets: { V: 35, alt: 1000, hdg_deg: 0 },
        wind: { n: 0, e: 0, d: 0 },
        autopilot: true,
    },
    "Crosswind Landing": {
        targets: { V: 30, alt: 200, hdg_deg: 270 },
        wind: { n: 0, e: 8, d: 0 },
        autopilot: true,
    },
    "Engine Failure": {
        targets: { V: 25, alt: 800, hdg_deg: 0 },
        wind: { n: 0, e: 0, d: 0 },
        autopilot: false,
    },
    "Steep Turn": {
        targets: { V: 40, alt: 1000, hdg_deg: 90 },
        wind: { n: 0, e: 0, d: 0 },
        autopilot: true,
    },
    "Wind Shear": {
        targets: { V: 35, alt: 500, hdg_deg: 0 },
        wind: { n: 5, e: 0, d: 2 },
        autopilot: true,
    },
};

// ── Component ────────────────────────────────────────────────────────────────

export default function InstrumentPanel({ state, history, sendCommand, connected }: InstrumentPanelProps) {
    const [autopilotOn, setAutopilotOn] = useState(true);
    const [targetAlt, setTargetAlt] = useState(1000);
    const [targetSpeed, setTargetSpeed] = useState(35);
    const [targetHdg, setTargetHdg] = useState(0);
    const [windN, setWindN] = useState(0);
    const [windE, setWindE] = useState(0);
    const [turbIntensity, setTurbIntensity] = useState(0.1);
    const [activeScenario, setActiveScenario] = useState<string | null>(null);
    const [isApplying, setIsApplying] = useState(false);

    // ── Chart data — last 200 points ──────────────────────────────────────

    const TAIL = 200;
    const tail = history.length > TAIL ? history.slice(-TAIL) : history;

    const altData = useMemo(
        () => tail.map((s) => ({ t: s.time, v: s.altitude_m })),
        [tail.length],
    );
    const speedData = useMemo(
        () => tail.map((s) => ({
            t: s.time,
            v: Math.sqrt(s.u * s.u + s.v * s.v + s.w * s.w),
        })),
        [tail.length],
    );
    const pitchData = useMemo(
        () => tail.map((s) => ({
            t: s.time,
            v: (s.theta * 180) / Math.PI,
        })),
        [tail.length],
    );

    // ── Command helpers ───────────────────────────────────────────────────

    const pushTargets = useCallback(
        (overrides?: { V?: number; alt?: number; hdg_deg?: number }) => {
            sendCommand({
                type: "set_targets",
                V: overrides?.V ?? targetSpeed,
                alt: overrides?.alt ?? targetAlt,
                hdg_deg: overrides?.hdg_deg ?? targetHdg,
            });
        },
        [sendCommand, targetSpeed, targetAlt, targetHdg],
    );

    const pushWind = useCallback(
        (n: number, e: number, d: number) => {
            sendCommand({ type: "set_wind", n, e, d });
        },
        [sendCommand],
    );

    const pushTurbulence = useCallback(
        (intensity: number) => {
            sendCommand({ type: "set_turbulence", intensity });
        },
        [sendCommand],
    );

    const toggleAutopilot = useCallback(
        (enabled: boolean) => {
            setAutopilotOn(enabled);
            sendCommand({ type: "set_autopilot", enabled });
        },
        [sendCommand],
    );

    const applyScenario = useCallback(
        (config: ScenarioConfig) => {
            if (config.targets.V !== undefined) setTargetSpeed(config.targets.V);
            if (config.targets.alt !== undefined) setTargetAlt(config.targets.alt);
            if (config.targets.hdg_deg !== undefined) setTargetHdg(config.targets.hdg_deg);
            setWindN(config.wind.n);
            setWindE(config.wind.e);
            if (config.autopilot !== undefined) {
                setAutopilotOn(config.autopilot);
                sendCommand({ type: "set_autopilot", enabled: config.autopilot });
            }
            sendCommand({ type: "set_targets", ...config.targets });
            sendCommand({ type: "set_wind", ...config.wind });
        },
        [sendCommand],
    );

    const handleApplyScenario = useCallback(
        (name: string, config: ScenarioConfig) => {
            setActiveScenario(name);
            setIsApplying(true);
            applyScenario(config);
            setTimeout(() => {
                setIsApplying(false);
            }, 2000);
        },
        [applyScenario],
    );

    // ── Render ────────────────────────────────────────────────────────────

    const deg = (rad: number | undefined) =>
        rad !== undefined ? ((rad * 180) / Math.PI).toFixed(1) : "--";
    const fix = (v: number | undefined, d = 1) =>
        v !== undefined ? v.toFixed(d) : "--";

    return (
        <div className="instrument-panel">
            {/* ── Scenario Indicator (Phase 11) ─────────────────────── */}
            {(activeScenario || isApplying) && (
                <div className="hud-panel" style={{
                    marginBottom: 8,
                    padding: "6px 12px",
                    borderLeft: `4px solid ${isApplying ? "#f59e0b" : "#34d399"}`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between"
                }}>
                    <span style={{ fontSize: 10, textTransform: "uppercase", fontWeight: "bold", letterSpacing: "0.1em" }}>
                        {isApplying ? `APPLYING: ${activeScenario?.toUpperCase()}` : activeScenario?.toUpperCase()}
                    </span>
                    {isApplying && (
                        <div className="animate-pulse" style={{ width: 6, height: 6, borderRadius: "50%", background: "#f59e0b" }} />
                    )}
                </div>
            )}

            {/* ── Mini charts ──────────────────────────────────────── */}
            <MiniChart data={altData} label="Altitude (m)" color="#60a5fa" unit="m" target={targetAlt} />
            <MiniChart data={speedData} label="Airspeed (m/s)" color="#34d399" unit="m/s" />
            <MiniChart data={pitchData} label="Pitch (°)" color="#f59e0b" unit="°" />

            {/* ── Velocity Legend (Phase 8) ─────────────────────────── */}
            <VelocityLegend />

            {/* ── HUD metrics ──────────────────────────────────────── */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 4 }}>
                <HudMetric label="Roll" value={`${deg(state?.phi)}°`} />
                <HudMetric label="Yaw" value={`${deg(state?.psi)}°`} />
                <HudMetric label="Alt" value={`${fix(state?.altitude_m, 0)} m`} />
                <HudMetric
                    label="Speed"
                    value={`${state ? Math.sqrt(state.u ** 2 + state.v ** 2 + state.w ** 2).toFixed(1) : "--"} m/s`}
                />
            </div>

            {/* ── Scenarios ────────────────────────────────────────── */}
            <div>
                <div className="flight-deck-panel-label" style={{ position: "static", marginBottom: 4 }}>
                    Scenarios
                </div>
                <div className="scenario-grid">
                    {Object.entries(SCENARIOS).map(([name, config]) => (
                        <button
                            key={name}
                            className={`scenario-btn ${activeScenario === name ? "scenario-btn--active" : ""}`}
                            disabled={!connected}
                            onClick={() => handleApplyScenario(name, config)}
                        >
                            {name}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Target controls ──────────────────────────────────── */}
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <div className="flight-deck-panel-label" style={{ position: "static" }}>
                    Targets
                </div>

                <Slider
                    label="Altitude"
                    unit="m"
                    value={targetAlt}
                    min={0}
                    max={5000}
                    step={50}
                    onChange={(v) => { setTargetAlt(v); pushTargets({ alt: v }); }}
                />
                <Slider
                    label="Airspeed"
                    unit="m/s"
                    value={targetSpeed}
                    min={15}
                    max={100}
                    step={1}
                    onChange={(v) => { setTargetSpeed(v); pushTargets({ V: v }); }}
                />
                <Slider
                    label="Heading"
                    unit="°"
                    value={targetHdg}
                    min={0}
                    max={359}
                    step={1}
                    onChange={(v) => { setTargetHdg(v); pushTargets({ hdg_deg: v }); }}
                />
                <Slider
                    label="Wind N"
                    unit="m/s"
                    value={windN}
                    min={-15}
                    max={15}
                    step={1}
                    onChange={(v) => { setWindN(v); pushWind(v, windE, 0); }}
                />
                <Slider
                    label="Wind E"
                    unit="m/s"
                    value={windE}
                    min={-15}
                    max={15}
                    step={1}
                    onChange={(v) => { setWindE(v); pushWind(windN, v, 0); }}
                />
                <Slider
                    label="Turbulence"
                    unit="%"
                    value={Math.round(turbIntensity * 100)}
                    min={0}
                    max={100}
                    step={5}
                    onChange={(v) => { setTurbIntensity(v / 100); pushTurbulence(v / 100); }}
                />

                <button
                    className={`autopilot-toggle ${autopilotOn ? "autopilot-toggle--active" : ""}`}
                    onClick={() => toggleAutopilot(!autopilotOn)}
                    disabled={!connected}
                >
                    <span className="hud-metric-label">Autopilot</span>
                    <span
                        className="hud-metric-value"
                        style={{ color: autopilotOn ? "#34d399" : "#ef4444", fontSize: 11 }}
                    >
                        {autopilotOn ? "ON" : "OFF"}
                    </span>
                </button>

                {/* ── Export (Phase 7) ─────────────────────────────────── */}
                <ExportButton history={history} />
            </div>
        </div>
    );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function VelocityLegend() {
    return (
        <div style={{ padding: "0 8px 12px 8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.4)" }}>20</span>
                <div style={{
                    flex: 1,
                    height: 4,
                    borderRadius: 2,
                    background: "linear-gradient(to right, #0000ff, #00ffff, #00ff00, #ffff00, #ff0000)"
                }} />
                <span style={{ fontSize: 9, fontFamily: "var(--font-mono)", color: "rgba(255,255,255,0.4)" }}>80 m/s</span>
            </div>
        </div>
    );
}

function ExportButton({ history }: { history: FlightState[] }) {
    const handleExport = () => {
        if (history.length === 0) return;

        const headers = ["time", "x", "y", "z", "phi_deg", "theta_deg", "psi_deg", "u", "v", "w", "altitude_m"];
        const rows = history.map((s) => [
            s.time.toFixed(3),
            s.x.toFixed(3),
            s.y.toFixed(3),
            s.z.toFixed(3),
            ((s.phi * 180) / Math.PI).toFixed(2),
            ((s.theta * 180) / Math.PI).toFixed(2),
            ((s.psi * 180) / Math.PI).toFixed(2),
            s.u.toFixed(3),
            s.v.toFixed(3),
            s.w.toFixed(3),
            s.altitude_m.toFixed(2),
        ].join(","));

        const csv = [headers.join(","), ...rows].join("\n");
        const blob = new Blob([csv], { type: "text/csv" });
        const url = URL.createObjectURL(blob);

        const a = document.createElement("a");
        a.href = url;
        a.download = `flight_${new Date().toISOString().slice(0, 19).replace(/:/g, "-")}.csv`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    };

    return (
        <button
            onClick={handleExport}
            className="scenario-btn"
            style={{ width: "100%", marginTop: 8, border: "1px solid rgba(255,255,255,0.2)" }}
        >
            Export Flight Data (.csv)
        </button>
    );
}

// ── Sub-components ───────────────────────────────────────────────────────────

function MiniChart({
    data,
    label,
    color,
    unit,
    target,
}: {
    data: { t: number; v: number }[];
    label: string;
    color: string;
    unit: string;
    target?: number;
}) {
    const firstTime = data.length > 0 ? data[0].t : 0;
    const lastTime = data.length > 0 ? data[data.length - 1].t : 0;

    return (
        <div className="instrument-chart-wrapper">
            <div className="instrument-chart-label">{label}</div>
            <ResponsiveContainer width="100%" height={80}>
                <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                    <XAxis 
                        dataKey="t" 
                        hide={false} 
                        axisLine={false} 
                        tickLine={false}
                        ticks={[firstTime, lastTime]}
                        tick={{ fontSize: 8, fill: "rgba(255,255,255,0.3)" }}
                        tickFormatter={(v) => `${v.toFixed(0)}s`}
                    />
                    <YAxis
                        domain={["auto", "auto"]}
                        width={35}
                        axisLine={false}
                        tickLine={false}
                        tickCount={3}
                        tick={{ fontSize: 8, fill: "rgba(255,255,255,0.3)" }}
                        tickFormatter={(v) => `${v}${unit}`}
                    />
                    {target !== undefined && (
                        <ReferenceLine 
                            y={target} 
                            stroke="rgba(255,255,255,0.2)" 
                            strokeDasharray="3 3" 
                        />
                    )}
                    <Line
                        type="monotone"
                        dataKey="v"
                        stroke={color}
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}

function HudMetric({ label, value }: { label: string; value: string }) {
    return (
        <div className="hud-metric">
            <span className="hud-metric-label">{label}</span>
            <span className="hud-metric-value">{value}</span>
        </div>
    );
}

function Slider({
    label,
    unit,
    value,
    min,
    max,
    step,
    onChange,
}: {
    label: string;
    unit: string;
    value: number;
    min: number;
    max: number;
    step: number;
    onChange: (v: number) => void;
}) {
    return (
        <div className="control-slider-group">
            <div className="control-slider-label">
                <span>{label}</span>
                <span className="control-slider-value">
                    {value} {unit}
                </span>
            </div>
            <input
                type="range"
                className="control-slider-input"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => onChange(Number(e.target.value))}
            />
        </div>
    );
}
