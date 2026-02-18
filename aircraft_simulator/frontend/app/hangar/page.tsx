"use client";

import AircraftSpecs from "@/components/hangar/AircraftSpecs";
import HangarViewer from "@/components/hangar/HangarViewer";
import { HangarMetadata } from "@/components/hangar/HangarMetadata";
import { useAircraftContext } from "@/context/AircraftContext";
import { Lock } from "lucide-react";

export default function HangarPage() {
    const { selectedAircraftId, metadata, aircraftData, loading, error, setAircraft } = useAircraftContext();

    const handleReload = async () => {
        if (!selectedAircraftId) return;
        await setAircraft(selectedAircraftId);
    };

    return (
        <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden">

            <main className="pt-24 px-8 pb-12 max-w-[1920px] mx-auto">
                <header className="mb-8 flex items-end justify-between border-b border-white/5 pb-6">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase">Aircraft Hangar</h1>
                            <div className="px-1.5 py-0.5 border border-white/20 text-[9px] font-mono text-white/60 uppercase tracking-widest flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" />
                                Backend Auth
                            </div>
                        </div>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Configuration & Analysis</h2>
                    </div>
                    <div className="flex gap-4">
                        <button className="btn-glow-primary text-xs" onClick={handleReload} disabled={!selectedAircraftId || loading}>
                            {loading ? "Loading..." : "Refresh From Backend"}
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-12 gap-8 max-h-[70vh]">
                    {/* Left: Specifications & Metadata */}
                    <div className="col-span-7 h-full overflow-auto pr-2 custom-scrollbar">
                        <HangarMetadata />
                        {error ? (
                            <div className="text-xs font-mono text-red-400">Backend unavailable.</div>
                        ) : (
                            <AircraftSpecs aircraft={aircraftData} />
                        )}
                    </div>

                    {/* Right: 3D Viewer */}
                    <div className="col-span-5 h-full flex items-center justify-center rounded-xl border border-white/10 overflow-hidden bg-black/20">
                        <HangarViewer
                            aircraftId={selectedAircraftId}
                            name={metadata?.name ?? null}
                            wingspan={aircraftData?.geometry.wingspan ?? null}
                        />
                    </div>
                </div>
            </main>

            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-[-1]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,_rgba(17,24,39,1)_0%,_rgba(0,0,0,1)_100%)]" />
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.02)_1px,transparent_1px)] bg-[size:50px_50px] opacity-20" />
            </div>
        </div>
    );
}
