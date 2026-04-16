
"use client";

import React, { useMemo } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    ReferenceLine,
} from "recharts";
import { FlightRecord } from "@/types/FlightRecord";

interface ReplayChartsProps {
    records: FlightRecord[];
    currentTime: number;
    onScrub: (time: number) => void;
}

export default function ReplayCharts({ records, currentTime, onScrub }: ReplayChartsProps) {
    const data = useMemo(() => {
        return records.map(r => ({
            time: r.time,
            alt: r.altitude_m,
            speed: Math.sqrt(r.u ** 2 + r.v ** 2 + r.w ** 2),
            theta: r.theta_deg,
            phi: r.phi_deg,
        }));
    }, [records]);

    const startTime = records[0]?.time || 0;
    const endTime = records[records.length - 1]?.time || 100;
    const duration = endTime - startTime;

    const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const percent = Number(e.target.value) / 100;
        onScrub(startTime + percent * duration);
    };

    const currentPercent = ((currentTime - startTime) / duration) * 100;

    return (
        <div className="space-y-6">
            {/* Scrubber */}
            <div className="hud-panel p-4 bg-white/[0.02] border border-white/10 rounded-xl">
                <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Temporal Analysis</span>
                    <span className="text-[10px] font-mono text-white/80 font-bold tracking-tighter">
                        {currentTime.toFixed(2)}s / {endTime.toFixed(2)}s
                    </span>
                </div>
                <input 
                    type="range"
                    min="0"
                    max="100"
                    step="0.1"
                    value={currentPercent}
                    onChange={handleSliderChange}
                    className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-white"
                />
            </div>

            {/* Charts Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <ChartWrapper title="Altitude (m)" data={data} dataKey="alt" color="#3b82f6" currentTime={currentTime} />
                <ChartWrapper title="Airspeed (m/s)" data={data} dataKey="speed" color="#10b981" currentTime={currentTime} />
                <ChartWrapper title="Pitch (deg)" data={data} dataKey="theta" color="#f59e0b" currentTime={currentTime} />
                <ChartWrapper title="Roll (deg)" data={data} dataKey="phi" color="#f43f5e" currentTime={currentTime} />
            </div>
        </div>
    );
}

function ChartWrapper({ title, data, dataKey, color, currentTime }: { title: string, data: any[], dataKey: string, color: string, currentTime: number }) {
    return (
        <div className="hud-panel p-4 border border-white/5 bg-white/[0.01] rounded-lg h-[240px]">
            <div className="text-[9px] font-mono uppercase tracking-widest text-white/30 mb-2">{title}</div>
            <ResponsiveContainer width="100%" height="85%">
                <LineChart data={data}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                    <XAxis 
                        dataKey="time" 
                        hide 
                        domain={["dataMin", "dataMax"]} 
                        type="number"
                    />
                    <YAxis 
                        tick={{ fontSize: 9, fill: "rgba(255,255,255,0.3)" }} 
                        axisLine={false} 
                        tickLine={false}
                        domain={["auto", "auto"]}
                        orientation="right"
                    />
                    <Tooltip 
                        contentStyle={{ backgroundColor: "#080808", border: "1px solid rgba(255,255,255,0.1)", fontSize: 10, fontFamily: "var(--font-mono)" }}
                        itemStyle={{ color: color }}
                        labelStyle={{ color: "rgba(255,255,255,0.5)" }}
                        labelFormatter={(v) => `T: ${v}s`}
                    />
                    <ReferenceLine x={currentTime} stroke="rgba(255,255,255,0.8)" strokeWidth={1} />
                    <Line
                        type="monotone"
                        dataKey={dataKey}
                        stroke={color}
                        strokeWidth={1.5}
                        dot={false}
                        isAnimationActive={false}
                    />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
