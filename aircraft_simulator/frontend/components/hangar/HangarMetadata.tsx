"use client";

import { useAircraftContext } from "@/context/AircraftContext";

export const HangarMetadata = () => {
    const { metadata, validation, loading, error } = useAircraftContext();

    if (loading) {
        return (
            <div className="mb-6 border border-white/10 bg-white/5 p-4 text-[10px] font-mono text-white/60">
                Loading aircraft dataset from backend...
            </div>
        );
    }

    if (error) {
        return (
            <div className="mb-6 border border-amber-500/20 bg-amber-500/5 p-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-amber-300">Backend Unavailable</div>
                <p className="text-[10px] font-mono text-amber-200/70">{error}</p>
            </div>
        );
    }

    if (!metadata) {
        return (
            <div className="mb-6 border border-white/10 bg-white/5 p-4 text-[10px] font-mono text-white/60">
                No aircraft selected. Choose a model to load backend data.
            </div>
        );
    }

    return (
        <div className="mb-6 space-y-4">
            <div className="border border-white/10 bg-white/5 p-4">
                <div className="mb-2 text-xs font-bold uppercase tracking-wider text-white/70">Backend Dataset Loaded</div>
                <p className="text-[10px] font-mono text-white/60">
                    {metadata.name} - {metadata.classification} - {metadata.stabilityMode}
                </p>
            </div>

            {!validation.backendCapable && (
                <div className="border border-amber-500/20 bg-amber-500/5 p-3 text-[10px] font-mono text-amber-200/80">
                    Backend capability check failed. Results may be incomplete.
                </div>
            )}
        </div>
    );
};
