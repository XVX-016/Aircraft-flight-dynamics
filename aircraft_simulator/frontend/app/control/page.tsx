"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import WindFlow from '@/components/pilot/WindFlow';
import { ArrowLeft } from 'lucide-react';

const ControlAnalysisPage = () => {
    const [gains, setGains] = useState({
        kp: 45,
        ki: 20,
        kd: 35,
        q1: 60,
        q2: 40,
        r: 25,
    });

    const [stabilityData, setStabilityData] = useState<{ x: number; y: number }[]>([]);
    const [bodeData, setBodeData] = useState<{ freq: number; mag: number; phase: number }[]>([]);

    useEffect(() => {
        // Generate stability data based on gains
        const data = [];
        for (let t = 0; t <= 100; t += 2) {
            const damping = gains.kd / 100;
            const freq = gains.kp / 50;
            const y = Math.exp(-damping * t * 0.1) * Math.cos(freq * t * 0.15) * (1 - gains.ki / 200);
            data.push({ x: t, y: y * 50 + 50 });
        }
        setStabilityData(data);

        // Generate bode plot data
        const bode = [];
        for (let f = 0.1; f <= 100; f *= 1.3) {
            const mag = 20 * Math.log10(gains.kp / (f + 1)) - f * 0.1;
            const phase = -Math.atan(f / gains.kd) * (180 / Math.PI) - f * 0.5;
            bode.push({ freq: f, mag, phase });
        }
        setBodeData(bode);
    }, [gains]);

    const sliderConfig = [
        { key: 'kp' as const, label: 'Kp Gain', sublabel: 'Proportional' },
        { key: 'ki' as const, label: 'Ki Gain', sublabel: 'Integral' },
        { key: 'kd' as const, label: 'Kd Gain', sublabel: 'Derivative' },
        { key: 'q1' as const, label: 'Q₁ Weight', sublabel: 'State Cost' },
        { key: 'q2' as const, label: 'Q₂ Weight', sublabel: 'Rate Cost' },
        { key: 'r' as const, label: 'R Weight', sublabel: 'Control Effort' },
    ];

    const renderStabilityGraph = () => {
        const width = 600;
        const height = 250;

        if (stabilityData.length === 0) return null;

        const points = stabilityData.map((d) => {
            const x = (d.x / 100) * width;
            const y = height - (d.y / 100) * height;
            return `${x},${y}`;
        }).join(' ');

        return (
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                <defs>
                    <linearGradient id="stability-gradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00E680" stopOpacity="0.3" />
                        <stop offset="100%" stopColor="#00E680" stopOpacity="0" />
                    </linearGradient>
                </defs>

                {/* Grid */}
                {[0, 1, 2, 3, 4].map((i) => (
                    <line key={`h-${i}`} x1={0} y1={(i / 4) * height} x2={width} y2={(i / 4) * height} stroke="white" strokeOpacity={0.05} />
                ))}
                {[0, 1, 2, 3, 4, 5].map((i) => (
                    <line key={`v-${i}`} x1={(i / 5) * width} y1={0} x2={(i / 5) * width} y2={height} stroke="white" strokeOpacity={0.05} />
                ))}

                {/* Reference line */}
                <line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="white" strokeOpacity={0.2} strokeDasharray="4 4" />

                {/* Area fill */}
                <polygon
                    points={`0,${height} ${points} ${width},${height}`}
                    fill="url(#stability-gradient)"
                />

                {/* Line */}
                <polyline
                    points={points}
                    fill="none"
                    stroke="#00E680"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </svg>
        );
    };

    const renderBodePlot = () => {
        const width = 600;
        const height = 200;

        if (bodeData.length === 0) return null;

        const magPoints = bodeData.map((d) => {
            const x = (Math.log10(d.freq) / 2 + 0.5) * width;
            const y = height / 2 - d.mag * 2;
            return `${x},${Math.max(0, Math.min(height, y))}`;
        }).join(' ');

        const phasePoints = bodeData.map((d) => {
            const x = (Math.log10(d.freq) / 2 + 0.5) * width;
            const y = height / 2 - d.phase * 0.5;
            return `${x},${Math.max(0, Math.min(height, y))}`;
        }).join(' ');

        return (
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                {/* Grid */}
                {[0, 1, 2, 3, 4].map((i) => (
                    <line key={`h-${i}`} x1={0} y1={(i / 4) * height} x2={width} y2={(i / 4) * height} stroke="white" strokeOpacity={0.05} />
                ))}

                {/* Magnitude line */}
                <polyline
                    points={magPoints}
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth={2}
                    strokeLinecap="round"
                />

                {/* Phase line */}
                <polyline
                    points={phasePoints}
                    fill="none"
                    stroke="#FFBF00"
                    strokeWidth={2}
                    strokeLinecap="round"
                    strokeDasharray="6 3"
                />
            </svg>
        );
    };

    return (
        <div className="relative min-h-screen overflow-hidden">
            {/* Dynamic Overlays */}
            <WindFlow />

            {/* Header - Handled Global Nav */}
            <div className="pt-24" /> {/* Spacer for fixed nav */}

            {/* Main Content */}
            <div className="relative z-10 flex flex-col lg:flex-row gap-6 px-8 pb-8">
                {/* Sidebar - Parameter Tuning */}
                <aside
                    className="w-full lg:w-80 flex-shrink-0 rounded-lg overflow-hidden border border-white/10"
                    style={{
                        background: `
              repeating-linear-gradient(
                -45deg,
                #0F0F0F 0px,
                #0F0F0F 2px,
                #141414 2px,
                #141414 6px
              )
            `
                    }}
                >
                    <div className="p-6 backdrop-blur-xl bg-black/40">
                        <h2 className="text-xs font-mono tracking-[0.3em] text-white/50 uppercase mb-6">
                            Parameter Tuning
                        </h2>

                        <div className="space-y-6">
                            {sliderConfig.map((item) => (
                                <div key={item.key} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-medium text-white">{item.label}</span>
                                            <span className="block text-[10px] font-mono text-white/40">{item.sublabel}</span>
                                        </div>
                                        <span className="text-sm font-mono text-accent">{gains[item.key]}</span>
                                    </div>

                                    <div className="relative group">
                                        <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                                            <div
                                                className="h-full bg-gradient-to-r from-white/60 to-white/80 rounded-full transition-all duration-150"
                                                style={{ width: `${gains[item.key]}%` }}
                                            />
                                        </div>
                                        <input
                                            type="range"
                                            min={0}
                                            max={100}
                                            value={gains[item.key]}
                                            onChange={(e) => setGains(prev => ({ ...prev, [item.key]: Number(e.target.value) }))}
                                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                        />
                                        <div
                                            className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg pointer-events-none"
                                            style={{ left: `calc(${gains[item.key]}% - 6px)` }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* K-Matrix Display */}
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <h3 className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase mb-4">
                                K-Matrix
                            </h3>
                            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                                {[gains.kp * 0.1, gains.ki * 0.05, gains.kd * 0.08,
                                gains.q1 * 0.02, gains.q2 * 0.03, gains.r * 0.04].map((val, i) => (
                                    <div key={i} className="bg-white/5 rounded px-2 py-1 text-center text-white/70">
                                        {val.toFixed(2)}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                {/* Main Graphs */}
                <main className="flex-1 space-y-6">
                    {/* Title */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">
                            Control Analysis
                        </h1>
                        <p className="text-sm text-white/40 font-mono text-center">LQR Controller Performance Metrics</p>
                    </div>

                    {/* System Stability Graph */}
                    <div className="glass-panel rounded-lg p-6 bg-black/60">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-mono tracking-[0.2em] text-white/50 uppercase">
                                System Stability Response
                            </h3>
                            <div className="flex items-center gap-4 text-[10px] font-mono">
                                <span className="text-white/40">Time Domain</span>
                                <span className="px-2 py-1 bg-accent/20 text-accent rounded">STABLE</span>
                            </div>
                        </div>
                        <div className="telemetry-grid rounded-lg p-4">
                            {renderStabilityGraph()}
                        </div>
                        <div className="flex justify-between mt-4 text-[10px] font-mono text-white/30">
                            <span>t = 0s</span>
                            <span>t = 50s</span>
                            <span>t = 100s</span>
                        </div>
                    </div>

                    {/* Bode Plot */}
                    <div className="glass-panel rounded-lg p-6 bg-black/60">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-mono tracking-[0.2em] text-white/50 uppercase">
                                Bode Plot
                            </h3>
                            <div className="flex items-center gap-6 text-[10px] font-mono">
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-0.5 bg-white rounded" />
                                    <span className="text-white/50">Magnitude (dB)</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <div className="w-4 h-0.5 bg-amber-400 rounded" style={{ backgroundImage: 'repeating-linear-gradient(90deg, #FFBF00 0px, #FFBF00 4px, transparent 4px, transparent 7px)' }} />
                                    <span className="text-white/50">Phase (°)</span>
                                </div>
                            </div>
                        </div>
                        <div className="telemetry-grid rounded-lg p-4">
                            {renderBodePlot()}
                        </div>
                        <div className="flex justify-between mt-4 text-[10px] font-mono text-white/30">
                            <span>0.1 Hz</span>
                            <span>1 Hz</span>
                            <span>10 Hz</span>
                            <span>100 Hz</span>
                        </div>
                    </div>

                    {/* Metrics Row */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                            { label: 'Gain Margin', value: '12.4 dB' },
                            { label: 'Phase Margin', value: '54.2°' },
                            { label: 'Bandwidth', value: '2.8 Hz' },
                            { label: 'Settling Time', value: '3.2s' },
                        ].map((metric) => (
                            <div key={metric.label} className="glass-panel rounded-lg p-4 bg-black/60 text-center">
                                <span className="block text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">
                                    {metric.label}
                                </span>
                                <span className="block text-xl font-mono text-white">{metric.value}</span>
                            </div>
                        ))}
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ControlAnalysisPage;
