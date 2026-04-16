"use client";

import { BarPlot } from "@/components/analysis/BarPlot";
import { SpectralPlot } from "@/components/analysis/SpectralPlot";
import { TimeSeriesPlot } from "@/components/analysis/TimeSeriesPlot";
import { useAircraftContext } from "@/context/AircraftContext";
import { useEffect, useState } from "react";
import ReplayTheater from "@/components/analysis/replay/ReplayTheater";

export default function AnalysisPage() {
    const { selectedAircraftId, getCachedAnalysis, runControlAnalysis, runFrequencyResponse, runModeShapes } = useAircraftContext();
    const [loading, setLoading] = useState(false);
    const [modeIndex, setModeIndex] = useState(0);
    const [activeTab, setActiveTab] = useState<"lab" | "replay">("lab");
    const frequency = getCachedAnalysis("frequencyResponse") as Record<string, any> | undefined;
    const modes = getCachedAnalysis("modeShapes") as Record<string, any> | undefined;
    const control = getCachedAnalysis("control") as Record<string, any> | undefined;

    const refresh = async (nextModeIndex = modeIndex) => {
        if (!selectedAircraftId) return;
        setLoading(true);
        try {
            await runControlAnalysis();
            await runFrequencyResponse({ input: "elevator", output: "theta" });
            await runModeShapes({ mode_index: nextModeIndex });
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
                <header className="mb-12 border-b border-white/5 pb-6 flex flex-col md:flex-row md:items-end justify-between gap-6">
                    <div>
                        <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">Analysis Hub</h1>
                        <h2 className="text-3xl font-bold text-white tracking-tight">
                            {activeTab === "lab" ? "Frequency Stability Lab" : "Flight Replay Theater"}
                        </h2>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-lg border border-white/10">
                        <button 
                            onClick={() => setActiveTab("lab")}
                            className={`px-6 py-2 text-[10px] font-mono uppercase tracking-widest transition-all ${activeTab === "lab" ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white/60"}`}
                        >
                            Stability Lab
                        </button>
                        <button 
                            onClick={() => setActiveTab("replay")}
                            className={`px-6 py-2 text-[10px] font-mono uppercase tracking-widest transition-all ${activeTab === "replay" ? "bg-white/10 text-white shadow-lg" : "text-white/40 hover:text-white/60"}`}
                        >
                            Flight Replay
                        </button>
                    </div>
                </header>

                {!selectedAircraftId && activeTab === "lab" && (
                    <div className="p-4 border border-white/10 bg-white/5 text-xs font-mono text-white/60 mb-6">
                        Select an aircraft in the hangar first for stability analysis.
                    </div>
                )}

                {activeTab === "lab" ? (
                    <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 animate-fade-in-up">
                        <div className="xl:col-span-3">
                            <div className="hud-panel p-6 border border-white/10 bg-white/[0.02] rounded-xl space-y-4">
                                <div className="text-[10px] uppercase text-white/40">Mode Explorer</div>
                                <label className="block text-[10px] font-mono uppercase text-white/50">Mode index {modeIndex}<input type="range" min={0} max={6} step={1} value={modeIndex} onChange={(e) => setModeIndex(Number(e.target.value))} className="w-full mt-2" /></label>
                                <button onClick={() => void refresh(modeIndex)} disabled={!selectedAircraftId || loading} className="w-full border border-white/20 bg-white/5 text-white text-xs font-bold uppercase tracking-widest py-3">{loading ? "Computing..." : "Recompute Analysis"}</button>
                            </div>
                        </div>
                        <div className="xl:col-span-9 space-y-6">
                            {control && <SpectralPlot openLoop={control.open_loop?.eigenvalues ?? []} closedLoop={control.closed_loop?.eigenvalues ?? []} title="Root-Locus-Like Gain Shift" />}
                            {frequency && (
                                <>
                                    <TimeSeriesPlot title="Bode Magnitude" x={frequency.omega_rad_s ?? []} series={[{ label: "Open loop", values: frequency.open_loop?.magnitude_db ?? [], color: "#60a5fa" }, { label: "Closed loop", values: frequency.closed_loop?.magnitude_db ?? [], color: "#f87171" }]} />
                                    <TimeSeriesPlot title="Bode Phase" x={frequency.omega_rad_s ?? []} series={[{ label: "Open loop", values: frequency.open_loop?.phase_deg ?? [], color: "#60a5fa" }, { label: "Closed loop", values: frequency.closed_loop?.phase_deg ?? [], color: "#f87171" }]} />
                                </>
                            )}
                            {modes && <BarPlot title="Mode Shape Magnitudes" values={(modes.components ?? []).map((item: { state: string; magnitude: number }) => ({ label: item.state, value: item.magnitude }))} />}
                        </div>
                    </div>
                ) : (
                    <ReplayTheater />
                )}
            </div>
        </div>
    );
}
