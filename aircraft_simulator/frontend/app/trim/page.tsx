"use client";

import { useEffect, useState } from "react";
import { Activity, Cpu } from "lucide-react";
import { useAircraftContext } from "@/context/AircraftContext";

export default function TrimPage() {
    const { selectedAircraftId, flightCondition, setFlightCondition, setAircraft, computed, loading, error } = useAircraftContext();
    const [velocity, setVelocity] = useState(flightCondition.velocity);
    const [altitude, setAltitude] = useState(flightCondition.altitude);

    const handleRecompute = async () => {
        await setFlightCondition({ velocity, altitude });
    };

    const hasResults = Boolean(computed.A && computed.eigenvalues);
    const eigenvalues = computed.eigenvalues ?? [];
    const unstable = eigenvalues.some((ev) => ev.real > 0);
    const eigenClass = (real: number) => {
        if (Math.abs(real) < 1e-4) return "text-white/50";
        if (real > 0) return "text-amber-300";
        return "text-white/70";
    };

    useEffect(() => {
        if (selectedAircraftId && !hasResults && !loading && !error) {
            void setAircraft(selectedAircraftId);
        }
    }, [selectedAircraftId, hasResults, loading, error, setAircraft]);

    return (
        <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden pt-24 px-8 pb-12">
            <div className="max-w-[1400px] mx-auto">
                <header className="mb-12 border-b border-white/5 pb-6">
                    <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">Flight Condition</h1>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Trim & Linearization</h2>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="hud-panel p-6 border border-white/10 bg-white/[0.02] rounded-xl">
                            <div className="flex items-center gap-2 mb-6 text-white/70">
                                <Cpu className="w-4 h-4" />
                                <h3 className="text-xs font-mono uppercase tracking-widest">Trim Conditions</h3>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] uppercase text-white/40 mb-1">Target Airspeed (m/s)</label>
                                    <input
                                        type="number"
                                        value={velocity}
                                        onChange={(e) => setVelocity(parseFloat(e.target.value))}
                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm font-mono text-white focus:border-blue-500 outline-none transition-colors"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] uppercase text-white/40 mb-1">Altitude (m)</label>
                                    <input
                                        type="number"
                                        value={altitude}
                                        onChange={(e) => setAltitude(parseFloat(e.target.value))}
                                        className="w-full bg-black/40 border border-white/10 rounded px-3 py-2 text-sm font-mono text-white focus:border-blue-500 outline-none transition-colors"
                                    />
                                </div>
                            </div>

                            <button
                                onClick={handleRecompute}
                                disabled={!selectedAircraftId || loading}
                                className="w-full mt-8 border border-white/20 bg-white/5 text-white text-xs font-bold uppercase tracking-widest py-3 flex items-center justify-center gap-2"
                            >
                                {loading ? <Activity className="w-4 h-4 animate-spin" /> : <Cpu className="w-4 h-4" />}
                                Recompute From Backend
                            </button>
                        </div>

                        {error && (
                            <div className="p-4 rounded border border-red-500/20 bg-red-500/5 text-xs font-mono text-red-300">
                                Backend unavailable. {error}
                            </div>
                        )}

                        {!selectedAircraftId && (
                            <div className="p-4 rounded border border-white/10 bg-white/5 text-xs font-mono text-white/60">
                                No aircraft selected. Choose a model in the Hangar or Home page.
                            </div>
                        )}
                    </div>

                    <div className="lg:col-span-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                                <span className="block text-[10px] text-white/30 uppercase mb-1">Alpha (rad)</span>
                                <span className="text-xl font-mono text-white">{computed.trim ? computed.trim.alpha_rad.toFixed(4) : "--"}</span>
                            </div>
                            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                                <span className="block text-[10px] text-white/30 uppercase mb-1">Elevator (rad)</span>
                                <span className="text-xl font-mono text-white">{computed.trim ? computed.trim.elevator_rad.toFixed(4) : "--"}</span>
                            </div>
                            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                                <span className="block text-[10px] text-white/30 uppercase mb-1">Throttle</span>
                                <span className="text-xl font-mono text-white">{computed.trim ? computed.trim.throttle.toFixed(3) : "--"}</span>
                            </div>
                        </div>

                        <div className="hud-panel p-6 border border-white/10 bg-white/[0.02] rounded-xl flex-1 min-h-[400px]">
                            <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2 text-white/70">
                                    <Activity className="w-4 h-4" />
                                    <h3 className="text-xs font-mono uppercase tracking-widest">System Dynamics Matrix (A)</h3>
                                </div>
                                <span className="text-[10px] font-mono text-white/30">Backend linearization</span>
                            </div>

                            <div className="relative w-full h-64 border border-white/5 bg-black/40 rounded flex items-center justify-center overflow-hidden">
                                {hasResults ? (
                                    <div className="font-mono text-[10px] text-white/60 whitespace-pre">
                                        A[0..2][0..2] = {JSON.stringify(computed.A?.slice(0, 3).map((r) => r.slice(0, 3)))}
                                    </div>
                                ) : (
                                    <span className="text-xs text-white/30 font-mono uppercase tracking-widest">
                                        Awaiting backend results
                                    </span>
                                )}
                            </div>

                            {hasResults && (
                                <div className="mt-6 p-3 border-l-2 border-white/20 bg-white/5">
                                    <div className={`text-xs font-mono uppercase ${unstable ? "text-amber-300" : "text-white/70"}`}>
                                        {unstable ? "Relaxed / Unstable Configuration" : "Open-Loop Stable Configuration"}
                                    </div>
                                    <div className="text-[10px] font-mono text-white/50 mt-1">
                                        {unstable
                                            ? "Open-loop instability detected. Control augmentation required."
                                            : "All dynamic modes stable at current trim condition."}
                                    </div>
                                </div>
                            )}
                        </div>

                        {hasResults && (
                            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                                <div className="text-[10px] uppercase text-white/40 mb-2">Eigenvalues</div>
                                <div className="grid grid-cols-2 gap-2 text-xs font-mono text-white/70">
                                    {eigenvalues.map((ev, idx) => (
                                        <div key={idx} className={eigenClass(ev.real)}>
                                            {ev.real.toFixed(3)} {ev.imag >= 0 ? "+" : "-"} {Math.abs(ev.imag).toFixed(3)}i
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
