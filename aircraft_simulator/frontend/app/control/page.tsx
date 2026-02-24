"use client";

import { useAircraftContext } from "@/context/AircraftContext";
import { ModeTable } from "@/components/analysis/ModeTable";
import { SpectralPlot } from "@/components/analysis/SpectralPlot";
import { StabilityOverview } from "@/components/analysis/StabilityOverview";

export default function ControlPage() {
    const { computed, loading, error } = useAircraftContext();

    const eigenvalues = computed.eigenvalues ?? [];
    const unstable = eigenvalues.some((ev) => ev.real > 0);

    return (
        <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden pt-24 px-8 pb-12">
            <div className="max-w-[1400px] mx-auto">
                <header className="mb-12 border-b border-white/5 pb-6">
                    <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">Control</h1>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Backend-Driven Stability Modes</h2>
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
                    <div className="space-y-6">
                        <StabilityOverview modal={computed.modalAnalysis} />
                        <SpectralPlot openLoop={eigenvalues} title="Open-Loop Spectrum" />
                        <ModeTable modes={computed.modalAnalysis?.modes} />
                        <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                            <div className="text-[10px] uppercase text-white/40 mb-2">Closed-Loop Comparison</div>
                            <div className="text-xs font-mono text-white/60">
                                Closed-loop spectral shift will be shown when backend exposes an `LQR` comparison endpoint.
                            </div>
                            <div className={`text-[10px] font-mono mt-2 ${unstable ? "text-amber-300" : "text-emerald-300"}`}>
                                Current open-loop classification: {unstable ? "Unstable / Relaxed" : "Stable"}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
