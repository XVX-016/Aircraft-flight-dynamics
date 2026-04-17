
"use client";

import React, { useMemo } from "react";
import { FlightRecord } from "@/types/FlightRecord";

interface StatsDashboardProps {
    records: FlightRecord[];
    scenario: string;
}

export default function StatsDashboard({ records, scenario }: StatsDashboardProps) {
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

        return {
            duration,
            maxAlt,
            maxSpeed,
            maxRoll,
            distance
        };
    }, [records]);

    const getScenarioColor = (scenario: string) => {
        switch (scenario) {
            case "Banked Turn": return "border-amber-500/50 bg-amber-500/10 text-amber-300";
            case "Climb / Descent": return "border-blue-500/50 bg-blue-500/10 text-blue-300";
            case "Variable Speed Profile": return "border-rose-500/50 bg-rose-500/10 text-rose-300";
            case "Crosswind Drift": return "border-cyan-500/50 bg-cyan-500/10 text-cyan-300";
            case "Straight & Level": return "border-emerald-500/50 bg-emerald-500/10 text-emerald-300";
            default: return "border-white/20 bg-white/10 text-white";
        }
    };

    if (!stats) return null;

    if (!stats) return null;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/60">Flight Profile Detected:</span>
                    <span className={`px-3 py-1 border text-[10px] font-bold uppercase tracking-wider rounded hud-panel ${getScenarioColor(scenario)}`}>
                        {scenario}
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
