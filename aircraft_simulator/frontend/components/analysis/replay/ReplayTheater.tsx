
"use client";

import React, { useState } from "react";
import { FlightRecord } from "@/types/FlightRecord";
import FlightLoader from "./FlightLoader";
import StatsDashboard from "./StatsDashboard";
import ReplayCharts from "./ReplayCharts";
import ReplayViewport from "./ReplayViewport";

function detectScenario(records: FlightRecord[]): string {
    if (records.length === 0) return "Straight & Level";

    const maxRoll = Math.max(...records.map(r => Math.abs(r.phi_deg)));
    const maxAlt = Math.max(...records.map(r => r.altitude_m));
    const minAlt = Math.min(...records.map(r => r.altitude_m));
    const speeds = records.map(r => Math.sqrt(r.u ** 2 + r.v ** 2 + r.w ** 2));
    const maxSpeed = Math.max(...speeds);
    const minSpeed = Math.min(...speeds);
    const maxY = Math.max(...records.map(r => Math.abs(r.y)));

    if (maxRoll > 20) return "Banked Turn";
    if (maxAlt - minAlt > 200) return "Climb / Descent";
    if (maxSpeed - minSpeed > 5) return "Variable Speed Profile";
    if (maxY > 50) return "Crosswind Drift";
    return "Straight & Level";
}

export default function ReplayTheater() {
    const [records, setRecords] = useState<FlightRecord[]>([]);
    const [currentTime, setCurrentTime] = useState(0);

    const handleLoad = (data: FlightRecord[]) => {
        setRecords(data);
        if (data.length > 0) {
            setCurrentTime(data[0].time);
        }
    };

    const scenario = detectScenario(records);

    if (records.length === 0) {
        return (
            <div className="max-w-4xl mx-auto py-12">
                <FlightLoader onLoad={handleLoad} />
            </div>
        );
    }

    return (
        <div className="space-y-8 animate-fade-in-up">
            {/* Header / Stats */}
            <StatsDashboard records={records} scenario={scenario} />

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                {/* 3D Viewport - Takes more space on large screens */}
                <div className="xl:col-span-12">
                    <ReplayViewport records={records} currentTime={currentTime} />
                </div>

                {/* Scrubber & Synchronized Charts */}
                <div className="xl:col-span-12">
                    <ReplayCharts 
                        records={records} 
                        currentTime={currentTime} 
                        onScrub={setCurrentTime} 
                    />
                </div>
            </div>

            <div className="flex justify-center py-8">
                <button 
                    onClick={() => setRecords([])}
                    className="px-6 py-2 border border-white/10 hover:bg-white/5 text-[10px] font-mono uppercase tracking-[0.2em] text-white/40 transition-colors"
                >
                    Clear Replay Data
                </button>
            </div>
        </div>
    );
}
