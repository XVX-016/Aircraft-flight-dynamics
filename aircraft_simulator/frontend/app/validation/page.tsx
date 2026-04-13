"use client";

import { ModeTable } from "@/components/analysis/ModeTable";
import { StabilityOverview } from "@/components/analysis/StabilityOverview";
import { useAircraftContext } from "@/context/AircraftContext";
import { useState } from "react";

function fmt(n: number | null | undefined) {
    if (n === null || n === undefined || !Number.isFinite(n)) return "--";
    return n.toFixed(4);
}

export default function ValidationPage() {
    const { selectedAircraftId, getCachedAnalysis, runValidation } = useAircraftContext();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const validation = getCachedAnalysis("validation") as Record<string, any> | undefined;
    const linearization = validation?.linearization;

    const refresh = async () => {
        if (!selectedAircraftId) return;
        setLoading(true);
        setError(null);
        try {
            await runValidation({ compare_builtins: true, include_estimation: true });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Backend unavailable");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden pt-24 px-8 pb-12">
            <div className="max-w-[1500px] mx-auto">
                <header className="mb-12 border-b border-white/5 pb-6">
                    <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">Validation</h1>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Active Numerical Checklist</h2>
                </header>
                {error && <div className="p-4 border border-red-500/20 bg-red-500/5 text-xs font-mono text-red-300 mb-6">{error}</div>}
                <div className="flex justify-between items-center mb-6">
                    <div className="text-xs font-mono text-white/60">Run trim, Jacobian, controllability, and estimator consistency checks on demand.</div>
                    <button onClick={() => void refresh()} disabled={!selectedAircraftId || loading} className="border border-white/20 bg-white/5 text-white text-xs font-bold uppercase tracking-widest py-3 px-4">{loading ? "Running..." : "Run Validation Suite"}</button>
                </div>
                {validation && (
                    <div className="space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
                            {(validation.checks ?? []).map((check: any) => (
                                <div key={check.key} className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                                    <div className="text-[10px] uppercase text-white/40 mb-1">{check.label}</div>
                                    <div className={`text-sm font-mono ${check.status === "pass" ? "text-emerald-300" : check.status === "fail" ? "text-red-300" : "text-amber-300"}`}>{String(check.status).toUpperCase()}</div>
                                    <div className="text-[10px] font-mono text-white/50 mt-2">value = {fmt(check.value)} | threshold = {fmt(check.threshold)}</div>
                                    <div className="text-[10px] font-mono text-white/60 mt-2">{check.explanation}</div>
                                    <div className="text-[10px] font-mono text-white/40 mt-2">Fix: {check.remediation}</div>
                                </div>
                            ))}
                        </div>
                        {linearization && (
                            <>
                                <StabilityOverview modal={linearization.modal_analysis} />
                                <ModeTable modes={linearization.modal_analysis?.modes} />
                            </>
                        )}
                        {validation.comparison && (
                            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg overflow-x-auto">
                                <div className="text-[10px] uppercase text-white/40 mb-3">Cross-Aircraft Comparison</div>
                                <table className="min-w-full text-xs font-mono text-white/70">
                                    <thead><tr className="border-b border-white/10"><th className="text-left py-2 pr-3">Aircraft</th><th className="text-right py-2 px-3">Trim residual</th><th className="text-right py-2 px-3">Spectral margin</th><th className="text-right py-2 pl-3">Unstable modes</th></tr></thead>
                                    <tbody>
                                        {validation.comparison.map((row: any) => (
                                            <tr key={row.aircraft_id} className="border-b border-white/5"><td className="py-2 pr-3">{row.aircraft_id}</td><td className="py-2 px-3 text-right">{fmt(row.trim_residual)}</td><td className="py-2 px-3 text-right">{fmt(row.spectral_margin)}</td><td className="py-2 pl-3 text-right">{row.unstable_modes}</td></tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
