"use client";

import { useAircraftContext } from "@/context/AircraftContext";

export default function ValidationPage() {
    const { computed, loading, error } = useAircraftContext();

    const hasResults = Boolean(computed.A && computed.B && computed.eigenvalues);
    const unstable = (computed.eigenvalues ?? []).some((ev) => ev.real > 0);
    const eigenClass = (real: number) => {
        if (Math.abs(real) < 1e-4) return "text-white/50";
        if (real > 0) return "text-amber-300";
        return "text-white/70";
    };
    const fmt = (n: number) => {
        if (!Number.isFinite(n)) return "nan";
        return n.toFixed(4);
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden pt-24 px-8 pb-12">
            <div className="max-w-[1400px] mx-auto">
                <header className="mb-12 border-b border-white/5 pb-6">
                    <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">Validation</h1>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Backend Linearization Results</h2>
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

                {!hasResults && !loading && !error && (
                    <div className="p-4 rounded border border-white/10 bg-white/5 text-xs font-mono text-white/60 mb-6">
                        No backend results yet. Select an aircraft and run analysis.
                    </div>
                )}

                {hasResults && (
                    <div className="grid grid-cols-1 gap-6">
                        <div className="hud-panel p-4 border border-white/10 bg-white/[0.02]">
                            <div className="text-[10px] uppercase text-white/40 mb-2">A Matrix (12x12)</div>
                            <div className="max-h-[50vh] overflow-auto border border-white/10 bg-black/40">
                                <table className="min-w-max border-collapse text-[10px] font-mono text-white/70">
                                    <tbody>
                                        {(computed.A ?? []).map((row, i) => (
                                            <tr key={`a-${i}`}>
                                                {row.map((val, j) => (
                                                    <td key={`a-${i}-${j}`} className="px-2 py-1 border border-white/5">
                                                        {fmt(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="hud-panel p-4 border border-white/10 bg-white/[0.02]">
                            <div className="text-[10px] uppercase text-white/40 mb-2">B Matrix (12x4)</div>
                            <div className="max-h-[30vh] overflow-auto border border-white/10 bg-black/40">
                                <table className="min-w-max border-collapse text-[10px] font-mono text-white/70">
                                    <tbody>
                                        {(computed.B ?? []).map((row, i) => (
                                            <tr key={`b-${i}`}>
                                                {row.map((val, j) => (
                                                    <td key={`b-${i}-${j}`} className="px-2 py-1 border border-white/5">
                                                        {fmt(val)}
                                                    </td>
                                                ))}
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                        <div className="hud-panel p-4 border border-white/10 bg-white/[0.02]">
                            <div className={`text-xs font-mono uppercase ${unstable ? "text-amber-300" : "text-white/70"}`}>
                                {unstable ? "Relaxed / Unstable Configuration" : "Open-Loop Stable Configuration"}
                            </div>
                            <div className="text-[10px] font-mono text-white/50 mt-1">
                                {unstable
                                    ? "Open-loop instability detected. Control augmentation required."
                                    : "All dynamic modes stable at current trim condition."}
                            </div>
                        </div>
                        <div className="hud-panel p-4 border border-white/10 bg-white/[0.02]">
                            <div className="text-[10px] uppercase text-white/40 mb-2">Eigenvalues</div>
                            <div className="grid grid-cols-2 gap-2 text-xs font-mono text-white/70">
                                {(computed.eigenvalues ?? []).map((ev, idx) => (
                                    <div key={idx} className={eigenClass(ev.real)}>
                                        {ev.real.toFixed(3)} {ev.imag >= 0 ? "+" : "-"} {Math.abs(ev.imag).toFixed(3)}i
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
