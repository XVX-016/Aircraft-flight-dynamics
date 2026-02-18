"use client";

import { AlertTriangle } from "lucide-react";
import { useAircraftContext } from "@/context/AircraftContext";

export const UnstableWarning = () => {
    const { computed } = useAircraftContext();
    const eigen = computed.eigenvalues ?? [];
    const unstable = eigen.some((ev) => ev.real > 0);

    if (!unstable) return null;

    return (
        <div className="mb-4 space-y-2">
            <div className="flex items-start gap-3 p-3 rounded border border-amber-500/20 bg-amber-500/5">
                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                    <h4 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-1">
                        Relaxed / Unstable Mode Detected
                    </h4>
                    <p className="text-[10px] text-amber-200/70 font-mono leading-relaxed">
                        Open-loop dynamic instability present. Control augmentation required.
                    </p>
                </div>
            </div>
        </div>
    );
};
