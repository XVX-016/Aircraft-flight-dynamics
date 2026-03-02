"use client";

import AircraftSpecs from "@/components/hangar/AircraftSpecs";
import HangarViewer from "@/components/hangar/HangarViewer";
import { HangarMetadata } from "@/components/hangar/HangarMetadata";
import { useAircraftContext } from "@/context/AircraftContext";

export default function HangarPage() {
    const { selectedAircraftId, metadata, aircraftData, loading, error, setAircraft } = useAircraftContext();

    const handleReload = async () => {
        if (!selectedAircraftId) return;
        await setAircraft(selectedAircraftId);
    };

    return (
        <div className="bg-neutral-950 text-white">
            <main className="pt-24 px-8 pb-16 max-w-[1920px] mx-auto">
                <header className="mb-8 flex items-end justify-between border-b border-white/5 pb-6">
                    <div>
                        <h1 className="mb-2 text-xs font-mono tracking-[0.4em] text-white/40 uppercase">Aircraft Hangar</h1>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Configuration & Analysis</h2>
                    </div>
                    <div className="flex gap-4">
                        <button className="btn-glow-primary text-xs" onClick={handleReload} disabled={!selectedAircraftId || loading}>
                            {loading ? "Loading..." : "Refresh From Backend"}
                        </button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
                    <div className="lg:col-span-7 pr-2">
                        <HangarMetadata />
                        {error ? (
                            <div className="text-xs font-mono text-red-400">Backend unavailable.</div>
                        ) : (
                            <AircraftSpecs aircraft={aircraftData} />
                        )}
                    </div>

                    <div className="lg:col-span-5 min-h-[520px] flex items-center justify-center border border-white/10 overflow-hidden bg-black">
                        <HangarViewer
                            aircraftId={selectedAircraftId}
                            name={metadata?.name ?? null}
                            wingspan={aircraftData?.geometry.wingspan ?? null}
                        />
                    </div>
                </div>
            </main>

        </div>
    );
}
