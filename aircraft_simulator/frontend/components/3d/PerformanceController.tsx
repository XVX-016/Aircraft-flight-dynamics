"use client";

import { PerformanceMonitor } from "@react-three/drei";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { useState } from "react";

export default function PerformanceController() {
    const setQuality = useSimulationStore((state) => state.setQuality);
    const [dpr, setDpr] = useState(2);

    return (
        <PerformanceMonitor
            onIncline={() => setQuality("high")}
            onDecline={() => setQuality("mid")}
            onFallback={() => {
                setQuality("low");
                setDpr(1);
            }}
            // Adjust DPR dynamically based on performance signals
            onChange={({ factor }) => setDpr(Math.round(0.5 + 1.5 * factor))}
        />
    );
}
