
"use client";

import React, { useMemo } from "react";
import { FlightRecord, ScenarioLabel } from "@/types/FlightRecord";

interface StatsDashboardProps {
    records: FlightRecord[];
}

export default function StatsDashboard({ records }: StatsDashboardProps) {
    const stats = useMemo(() => {
        if (records.length === 0) return null;

        const duration = records[records.length - 1].time - records[0].time;
        const maxAlt = Math.max(...records.map(r => r.altitude_m));
        const minAlt = Math.min(...records.map(r => r.altitude_m));
        
        const speeds = records.map(r => Math.sqrt(r.u ** 2 + r.v ** 2 + r.w ** 2));
        const maxSpeed = Math.max(...speeds);
        const minSpeed = Math.min(...speeds);
        
        const maxRoll = Math.max(...records.map(r => Math.abs(r.phi_deg)));
        const maxY = Math.max(...records.map(r => Math.abs(r.y)));

        // Distance traveled via numerical integration of horizontal displacement
        let distance = 0;
        for (let i = 1; i < records.length; i++) {
            const dx = records[i].x - records[i - 1].x;
            const dy = records[i].y - records[i - 1].y;
            distance += Math.sqrt(dx * dx + dy * dy);
        }

        // Scenario Detection
        let label: ScenarioLabel = "Straight and Level";
        if (maxRoll > 20) label = "Banked Turn / Steep Turn";
        else if (maxAlt - minAlt > 200) label = "Climb/Descent";
        else if (maxSpeed - minSpeed > 5) label = "Variable Speed Profile";
        else if (maxY > 50) label = "Crosswind Drift";

        return {
            duration,
            maxAlt,
            maxSpeed,
            maxRoll,
            distance,
            label
        };
    }, [records]);

    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">Flight Profile Detected:</span>
                    <span className="px-3 py-1 bg-white/10 border border-white/20 text-white font-bold text-[10px] uppercase tracking-wider rounded">
                        {stats.label}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <StatCard label="Duration" value={stats.duration.toFixed(1)} unit="s" />
                <StatCard label="Max Alt" value={stats.maxAlt.toFixed(0)} unit="m" />
                <StatCard label="Max Speed" value={stats.maxSpeed.toFixed(1)} unit="m/s" />
                <StatCard label="Max Bank" value={stats.maxRoll.toFixed(1)} unit="°" />
                <StatCard label="Distance" value={stats.distance.toFixed(0)} unit="m" />
            </div>
        </div>
    );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
    return (
        <div className="hud-panel p-4 border border-white/5 bg-white/[0.01] rounded-lg">
            <div className="text-[9px] font-mono uppercase tracking-widest text-white/30 mb-2">{label}</div>
            <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold tracking-tighter text-white">{value}</span>
                <span className="text-[9px] font-mono text-white/40">{unit}</span>
            </div>
        </div>
    );
}
