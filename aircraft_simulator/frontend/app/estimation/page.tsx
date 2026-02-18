"use client";

import { useAircraftContext } from "@/context/AircraftContext";

export default function EstimationPage() {
    const { computed, loading, error } = useAircraftContext();

    const eigenvalues = computed.eigenvalues ?? [];
    const eigenClass = (real: number) => {
        if (Math.abs(real) < 1e-4) return "text-white/50";
        if (real > 0) return "text-amber-300";
        return "text-white/70";
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden pt-24 px-8 pb-12">
            <div className="max-w-[1400px] mx-auto">
                <header className="mb-12 border-b border-white/5 pb-6">
                    <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">Estimation</h1>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Backend-Derived Stability Summary</h2>
                </header>

                {error && (
                    <div className="p-4 rounded border border-red-500/20 bg-red-500/5 text-xs font-mono text-red-300 mb-6">
                        Backend unavailable. {error}
                    </div>
                )}

                {loading && (
                    <div className="p-4 rounded border border-white/10 bg-white/5 text-xs font-mono text-white/60 mb-6">
                        Loading backend results...
                    </div>
                )}

                {!loading && !error && eigenvalues.length === 0 && (
                    <div className="p-4 rounded border border-white/10 bg-white/5 text-xs font-mono text-white/60 mb-6">
                        No backend data loaded. Select an aircraft to compute eigenvalues.
                    </div>
                )}

                {eigenvalues.length > 0 && (
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
    );
}
