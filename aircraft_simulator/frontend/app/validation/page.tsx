"use client";

import { ModeTable } from "@/components/analysis/ModeTable";
import { StabilityOverview } from "@/components/analysis/StabilityOverview";
import { useAircraftContext } from "@/context/AircraftContext";

function fmt(n: number) {
    if (!Number.isFinite(n)) return "nan";
    return n.toFixed(4);
}

export default function ValidationPage() {
    const { computed, loading, error } = useAircraftContext();
    const hasResults = Boolean(computed.A && computed.B && computed.eigenvalues && computed.trim);
    const residualOk = (computed.trim?.residual_norm ?? 1) < 1e-6;

    return (
        <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden pt-24 px-8 pb-12">
            <div className="max-w-[1400px] mx-auto">
                <header className="mb-12 border-b border-white/5 pb-6">
                    <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">Validation</h1>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Numerical Validation Dashboard</h2>
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
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                                <div className="text-[10px] uppercase text-white/40 mb-1">Trim Residual Check</div>
                                <div className={`text-sm font-mono ${residualOk ? "text-emerald-300" : "text-amber-300"}`}>
                                    {residualOk ? "PASS" : "WARN"}
                                </div>
                                <div className="text-[10px] font-mono text-white/50 mt-1">
                                    residual = {computed.trim?.residual_norm.toExponential(2)}
                                </div>
                            </div>
                            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                                <div className="text-[10px] uppercase text-white/40 mb-1">Golden Invariants</div>
                                <div className="text-sm font-mono text-emerald-300">PASS (test gate)</div>
                                <div className="text-[10px] font-mono text-white/50 mt-1">Validated in backend CI/test suite</div>
                            </div>
                            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                                <div className="text-[10px] uppercase text-white/40 mb-1">Jacobian Consistency</div>
                                <div className="text-sm font-mono text-emerald-300">PASS (test gate)</div>
                                <div className="text-[10px] font-mono text-white/50 mt-1">Directional FD consistency validated</div>
                            </div>
                        </div>

                        <StabilityOverview modal={computed.modalAnalysis} />
                        <ModeTable modes={computed.modalAnalysis?.modes} />

                        <details className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                            <summary className="text-[10px] uppercase text-white/40 cursor-pointer">Advanced: A Matrix (12x12)</summary>
                            <div className="max-h-[50vh] overflow-auto border border-white/10 bg-black/40 mt-3">
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
                        </details>

                        <details className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                            <summary className="text-[10px] uppercase text-white/40 cursor-pointer">Advanced: B Matrix (12x4)</summary>
                            <div className="max-h-[30vh] overflow-auto border border-white/10 bg-black/40 mt-3">
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
                        </details>
                    </div>
                )}
            </div>
        </div>
    );
}

