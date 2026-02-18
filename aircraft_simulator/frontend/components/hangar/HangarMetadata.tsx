"use client";

import { useAircraftContext } from "@/context/AircraftContext";
import { ShieldCheck, ShieldAlert } from "lucide-react";

export const HangarMetadata = () => {
    const { metadata, validation, loading, error } = useAircraftContext();

    if (loading) {
        return (
            <div className="p-4 border border-white/10 bg-white/5 mb-6 text-[10px] font-mono text-white/60">
                Loading aircraft dataset from backend...
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 border border-amber-500/20 bg-amber-500/5 mb-6">
                <div className="flex items-center gap-2 text-amber-300 mb-2">
                    <ShieldAlert className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Backend Unavailable</span>
                </div>
                <p className="text-[10px] text-amber-200/70 font-mono">{error}</p>
            </div>
        );
    }

    if (!metadata) {
        return (
            <div className="p-4 border border-white/10 bg-white/5 mb-6 text-[10px] font-mono text-white/60">
                No aircraft selected. Choose a model to load backend data.
            </div>
        );
    }

    return (
        <div className="space-y-4 mb-6">
            <div className="p-4 border border-white/10 bg-white/5">
                <div className="flex items-center gap-2 text-white/70 mb-2">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-xs font-bold uppercase tracking-wider">Backend Dataset Loaded</span>
                </div>
                <p className="text-[10px] text-white/60 font-mono">
                    {metadata.name} • {metadata.classification} • {metadata.stabilityMode}
                </p>
            </div>

            {!validation.backendCapable && (
                <div className="p-3 border border-amber-500/20 bg-amber-500/5 text-[10px] font-mono text-amber-200/80">
                    Backend capability check failed. Results may be incomplete.
                </div>
            )}
        </div>
    );
};
