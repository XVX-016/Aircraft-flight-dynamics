"use client";

import { SpectralPlot } from "@/components/analysis/SpectralPlot";
import { useAircraftContext } from "@/context/AircraftContext";
import { useEffect, useMemo, useState } from "react";

type Eig = { real: number; imag: number };

type ControlAnalysisResponse = {
    open_loop: {
        eigenvalues: Eig[];
        max_real_eig: number;
        spectral_margin: number;
        min_damping_ratio: number | null;
    };
    closed_loop: {
        eigenvalues: Eig[];
        max_real_eig: number;
        spectral_margin: number;
        min_damping_ratio: number | null;
    };
    lqr: {
        K: number[][];
        controllability_rank: number;
        controllability_condition: number;
    };
    improvement: {
        max_real_shift: number;
        damping_delta: number | null;
    };
};

const configuredApiBase = process.env.NEXT_PUBLIC_API_BASE?.trim();
const API_BASE = configuredApiBase ? configuredApiBase.replace(/\/+$/, "") : "";
const apiUrl = (path: string) => (API_BASE ? `${API_BASE}${path}` : path);

async function postJSON<T>(path: string, body: Record<string, unknown>): Promise<T> {
    const res = await fetch(apiUrl(path), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(await res.text());
    const data = (await res.json()) as T & { error?: string };
    if (data?.error) throw new Error(data.error);
    return data;
}

function fmt(v: number | null | undefined, d = 3) {
    if (v === null || v === undefined || !Number.isFinite(v)) return "--";
    return v.toFixed(d);
}

export default function ControlPage() {
    const { selectedAircraftId, flightCondition } = useAircraftContext();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [analysis, setAnalysis] = useState<ControlAnalysisResponse | null>(null);
    const [qPitchMult, setQPitchMult] = useState(1.0);
    const [qSpeedMult, setQSpeedMult] = useState(1.0);
    const [rEffortMult, setREffortMult] = useState(1.0);

    const fetchControl = async () => {
        if (!selectedAircraftId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await postJSON<ControlAnalysisResponse>("/api/v1/analysis/control", {
                V_mps: flightCondition.velocity,
                q_pitch_mult: qPitchMult,
                q_speed_mult: qSpeedMult,
                r_effort_mult: rEffortMult,
            });
            setAnalysis(data);
        } catch (e) {
            setError(e instanceof Error ? e.message : "Backend unavailable");
            setAnalysis(null);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchControl();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAircraftId, flightCondition.velocity]);

    const stableOpen = useMemo(
        () => (analysis ? analysis.open_loop.max_real_eig <= 0 : false),
        [analysis]
    );
    const stableClosed = useMemo(
        () => (analysis ? analysis.closed_loop.max_real_eig <= 0 : false),
        [analysis]
    );

    return (
        <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden pt-24 px-8 pb-12">
            <div className="max-w-[1400px] mx-auto">
                <header className="mb-12 border-b border-white/5 pb-6">
                    <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">Control</h1>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Closed-Loop LQR Analysis</h2>
                </header>

                {!selectedAircraftId && (
                    <div className="p-4 rounded border border-white/10 bg-white/5 text-xs font-mono text-white/60 mb-6">
                        No aircraft selected. Choose a model first.
                    </div>
                )}

                {error && (
                    <div className="p-4 rounded border border-red-500/20 bg-red-500/5 text-xs font-mono text-red-300 mb-6">
                        {error}
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="hud-panel p-6 border border-white/10 bg-white/[0.02] rounded-xl">
                            <div className="text-[10px] uppercase text-white/40 mb-4">Control Design Panel</div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] uppercase text-white/40 mb-1">Pitch weight multiplier</label>
                                    <input type="range" min={0.2} max={3.0} step={0.1} value={qPitchMult} onChange={(e) => setQPitchMult(Number(e.target.value))} className="w-full" />
                                    <div className="text-[10px] font-mono text-white/60 mt-1">{qPitchMult.toFixed(1)}x</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-white/40 mb-1">Airspeed weight multiplier</label>
                                    <input type="range" min={0.2} max={3.0} step={0.1} value={qSpeedMult} onChange={(e) => setQSpeedMult(Number(e.target.value))} className="w-full" />
                                    <div className="text-[10px] font-mono text-white/60 mt-1">{qSpeedMult.toFixed(1)}x</div>
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-white/40 mb-1">Control effort multiplier</label>
                                    <input type="range" min={0.2} max={3.0} step={0.1} value={rEffortMult} onChange={(e) => setREffortMult(Number(e.target.value))} className="w-full" />
                                    <div className="text-[10px] font-mono text-white/60 mt-1">{rEffortMult.toFixed(1)}x</div>
                                </div>
                            </div>
                            <button
                                onClick={() => void fetchControl()}
                                disabled={!selectedAircraftId || loading}
                                className="w-full mt-6 border border-white/20 bg-white/5 text-white text-xs font-bold uppercase tracking-widest py-3"
                            >
                                {loading ? "Computing..." : "Recompute Control"}
                            </button>
                        </div>
                    </div>

                    <div className="lg:col-span-8 space-y-6">
                        {analysis && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                                        <div className="text-[10px] uppercase text-white/40 mb-1">Open-loop &sigma;<sub>max</sub></div>
                                        <div className={`text-sm font-mono ${stableOpen ? "text-emerald-300" : "text-amber-300"}`}>
                                            {fmt(analysis.open_loop.max_real_eig, 4)}
                                        </div>
                                    </div>
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                                        <div className="text-[10px] uppercase text-white/40 mb-1">Closed-loop &sigma;<sub>max</sub></div>
                                        <div className={`text-sm font-mono ${stableClosed ? "text-emerald-300" : "text-amber-300"}`}>
                                            {fmt(analysis.closed_loop.max_real_eig, 4)}
                                        </div>
                                    </div>
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                                        <div className="text-[10px] uppercase text-white/40 mb-1">Stability Improvement</div>
                                        <div className="text-sm font-mono text-white">{fmt(analysis.improvement.max_real_shift, 4)}</div>
                                    </div>
                                </div>

                                <SpectralPlot
                                    openLoop={analysis.open_loop.eigenvalues}
                                    closedLoop={analysis.closed_loop.eigenvalues}
                                    title="Open vs Closed Loop Spectral Shift (Longitudinal)"
                                />

                                <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg overflow-x-auto">
                                    <div className="text-[10px] uppercase text-white/40 mb-3">LQR Gain Matrix K</div>
                                    <table className="min-w-full text-xs font-mono">
                                        <tbody>
                                            {analysis.lqr.K.map((row, i) => (
                                                <tr key={i} className="border-b border-white/5">
                                                    {row.map((v, j) => (
                                                        <td key={j} className="py-2 px-3 text-right text-white/80">{fmt(v, 4)}</td>
                                                    ))}
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                    <div className="text-[10px] font-mono text-white/50 mt-2">
                                        controllability rank: {analysis.lqr.controllability_rank}, condition: {fmt(analysis.lqr.controllability_condition, 3)}
                                    </div>
                                </div>

                                <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                                    <div className="text-[10px] uppercase text-white/40 mb-2">Damping Comparison</div>
                                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs font-mono">
                                        <div className="text-white/70">Open-loop &zeta;<sub>min</sub>: {fmt(analysis.open_loop.min_damping_ratio, 3)}</div>
                                        <div className="text-white/70">Closed-loop &zeta;<sub>min</sub>: {fmt(analysis.closed_loop.min_damping_ratio, 3)}</div>
                                        <div className="text-white/70">&Delta;&zeta;: {fmt(analysis.improvement.damping_delta, 3)}</div>
                                    </div>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}

