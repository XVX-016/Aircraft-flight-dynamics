"use client";

import { useAircraftContext } from "@/context/AircraftContext";

export default function BackendStatusBanner() {
    const { error } = useAircraftContext();
    if (!error) return null;

    return (
        <div className="w-full border-b border-white/10 bg-neutral-950 text-amber-300 text-[10px] font-mono uppercase tracking-[0.2em] px-6 py-2">
            Backend unavailable. Analysis engine not running.
        </div>
    );
}
