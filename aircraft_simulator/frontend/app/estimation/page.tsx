"use client";

import { TimeSeriesPlot } from "@/components/analysis/TimeSeriesPlot";
import { useAircraftContext } from "@/context/AircraftContext";
import { useEffect, useState } from "react";

function fmt(v: number | null | undefined, d = 3) {
    if (v === null || v === undefined || !Number.isFinite(v)) return "--";
    return v.toFixed(d);
}

export default function EstimationPage() {
    const { selectedAircraftId, getCachedAnalysis, runEstimation } = useAircraftContext();
    const [loading, setLoading] = useState(false);
    const [noiseScale, setNoiseScale] = useState(1);
    const estimation = getCachedAnalysis("estimation") as Record<string, any> | undefined;

    const refresh = async (nextNoise = noiseScale) => {
        if (!selectedAircraftId) return;
        setLoading(true);
        try {
            await runEstimation({ measurement_noise_scale: nextNoise, process_noise_scale: nextNoise, duration_s: 30 });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void refresh();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAircraftId]);

    return (
        <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden pt-24 px-8 pb-12">
            <div className="max-w-[1500px] mx-auto space-y-6">
                <header className="mb-12 border-b border-white/5 pb-6">
                    <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">Estimation</h1>
                    <h2 className="text-3xl font-bold text-white tracking-tight">EKF Consistency Workbench</h2>
                </header>
                {!selectedAircraftId && <div className="p-4 border border-white/10 bg-white/5 text-xs font-mono text-white/60">Select an aircraft first.</div>}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-3">
                        <div className="hud-panel p-6 border border-white/10 bg-white/[0.02] rounded-xl space-y-4">
                            <div className="text-[10px] uppercase text-white/40">Noise Injection</div>
                            <label className="block text-[10px] font-mono uppercase text-white/50">Noise multiplier {noiseScale.toFixed(1)}x<input type="range" min={0.5} max={4} step={0.1} value={noiseScale} onChange={(e) => setNoiseScale(Number(e.target.value))} className="w-full mt-2" /></label>
                            <button onClick={() => void refresh(noiseScale)} disabled={!selectedAircraftId || loading} className="w-full border border-white/20 bg-white/5 text-white text-xs font-bold uppercase tracking-widest py-3">{loading ? "Computing..." : "Run EKF"}</button>
                        </div>
                    </div>
                    <div className="xl:col-span-9 space-y-6">
                        {estimation && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><div className="text-[10px] uppercase text-white/40 mb-1">Mean NIS</div><div className="text-sm font-mono text-white">{fmt((estimation.nis ?? []).reduce((a: number, b: number) => a + b, 0) / Math.max(1, (estimation.nis ?? []).length), 3)}</div></div>
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><div className="text-[10px] uppercase text-white/40 mb-1">Mean NEES</div><div className="text-sm font-mono text-white">{fmt((estimation.nees ?? []).reduce((a: number, b: number) => a + b, 0) / Math.max(1, (estimation.nees ?? []).length), 3)}</div></div>
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><div className="text-[10px] uppercase text-white/40 mb-1">NIS 95% band</div><div className="text-sm font-mono text-white">{fmt(estimation.chi_square_bounds?.nis_95?.[0], 2)} - {fmt(estimation.chi_square_bounds?.nis_95?.[1], 2)}</div></div>
                                </div>
                                <TimeSeriesPlot title="Heading Truth vs Estimate" x={estimation.time_s ?? []} series={[{ label: "Truth", values: estimation.truth?.psi_rad ?? [], color: "#60a5fa" }, { label: "Estimate", values: estimation.estimate?.psi_rad ?? [], color: "#f87171" }]} />
                                <TimeSeriesPlot title="NIS Consistency" x={estimation.time_s ?? []} series={[{ label: "NIS", values: estimation.nis ?? [], color: "#a78bfa" }]} />
                                <TimeSeriesPlot title="NEES Consistency" x={estimation.time_s ?? []} series={[{ label: "NEES", values: estimation.nees ?? [], color: "#34d399" }]} />
                                <TimeSeriesPlot title="Estimated Path vs Truth" x={estimation.truth?.x_m ?? []} series={[{ label: "Truth y", values: estimation.truth?.y_m ?? [], color: "#60a5fa" }, { label: "Estimate y", values: estimation.estimate?.y_m ?? [], color: "#f87171" }]} />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
