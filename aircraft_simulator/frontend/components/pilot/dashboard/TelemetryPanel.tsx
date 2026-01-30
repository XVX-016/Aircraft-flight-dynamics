"use client";

import { useState } from 'react';
import { useSim } from '@/lib/providers/SimProvider';

export default function TelemetryPanel() {
    const [activeTab, setActiveTab] = useState<'flight' | 'inputs' | 'ekf'>('flight');
    const { derived, truthState } = useSim();

    // Safe defaults if state not yet available
    const altitude = derived?.altitude ?? 0;
    const airspeed = derived?.airspeed ?? 0;
    const aoa = derived?.aoa ?? 0;

    // Euler angles from quaternion (simplified approximation)
    const roll = truthState ? Math.atan2(2 * (truthState.q.w * truthState.q.x + truthState.q.y * truthState.q.z), 1 - 2 * (truthState.q.x ** 2 + truthState.q.y ** 2)) * 180 / Math.PI : 0;
    const pitch = truthState ? Math.asin(2 * (truthState.q.w * truthState.q.y - truthState.q.z * truthState.q.x)) * 180 / Math.PI : 0;
    const yaw = truthState ? Math.atan2(2 * (truthState.q.w * truthState.q.z + truthState.q.x * truthState.q.y), 1 - 2 * (truthState.q.y ** 2 + truthState.q.z ** 2)) * 180 / Math.PI : 0;

    return (
        <div className="hud-panel animate-slide-in-right">
            {/* Header / Tabs */}
            <div className="flex items-center gap-4 mb-6 border-b border-white/5 pb-2">
                <button
                    onClick={() => setActiveTab('flight')}
                    className={`text-[10px] font-mono tracking-[0.2em] uppercase transition-colors ${activeTab === 'flight' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                >
                    Flight
                </button>
                <button
                    onClick={() => setActiveTab('inputs')}
                    className={`text-[10px] font-mono tracking-[0.2em] uppercase transition-colors ${activeTab === 'inputs' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                >
                    Inputs
                </button>
                <button
                    onClick={() => setActiveTab('ekf')}
                    className={`text-[10px] font-mono tracking-[0.2em] uppercase transition-colors ${activeTab === 'ekf' ? 'text-white' : 'text-white/30 hover:text-white/60'}`}
                >
                    EKF
                </button>
            </div>

            <div className="min-h-[200px]">
                {activeTab === 'flight' && (
                    <div className="space-y-6">
                        <MetricRow label="Altitude" value={altitude.toFixed(0)} unit="FT" />
                        <MetricRow label="Airspeed" value={airspeed.toFixed(0)} unit="M/S" />
                        <MetricRow label="Heading" value={yaw.toFixed(0)} unit="DEG" />
                        <div className="grid grid-cols-2 gap-4">
                            <MetricRow label="Roll" value={roll.toFixed(1)} unit="°" />
                            <MetricRow label="Pitch" value={pitch.toFixed(1)} unit="°" />
                        </div>
                        <MetricRow label="AoA" value={(aoa * 180 / Math.PI).toFixed(1)} unit="°" />
                    </div>
                )}

                {activeTab === 'inputs' && (
                    <div className="space-y-4 text-xs font-mono text-white/60">
                        <p className="text-white/30">Control inputs via useSim().setControls()</p>
                        {/* TODO: Wire up control inputs from SimProvider */}
                    </div>
                )}

                {activeTab === 'ekf' && (
                    <div className="space-y-4 text-xs font-mono text-white/60">
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                            <span>STATUS</span>
                            <span className="text-emerald-400">CONVERGED</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded">
                            <span>MODE</span>
                            <span>EKF-15STATE</span>
                        </div>
                        <div className="mt-4">
                            <p className="text-white/30 mb-2">RESIDUALS</p>
                            <div className="flex gap-1 h-8 items-end">
                                {[0.2, 0.5, 0.3, 0.8, 0.4, 0.1].map((h, i) => (
                                    <div key={i} className="flex-1 bg-emerald-500/50" style={{ height: `${h * 100}%` }} />
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function MetricRow({ label, value, unit }: { label: string, value: string, unit: string }) {
    return (
        <div>
            <div className="flex justify-between items-end mb-1">
                <span className="text-[10px] text-white/30 uppercase tracking-[0.2em] font-mono text-xs">{label}</span>
                <span className="text-lg font-bold text-white leading-none tracking-tight">
                    {value} <span className="text-[10px] font-normal text-white/40 font-mono ml-1">{unit}</span>
                </span>
            </div>
            <div className="h-px w-full bg-gradient-to-r from-white/20 to-transparent" />
        </div>
    );
}

function InputBar({ label, value, min, max, center = false }: { label: string, value: number, min: number, max: number, center?: boolean }) {
    // Normalize to 0-100%
    const range = max - min;
    const pct = ((value - min) / range) * 100;

    return (
        <div>
            <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] text-white/40 uppercase tracking-[0.2em] font-mono">{label}</span>
                <span className="text-[10px] font-mono text-white">{value.toFixed(2)}</span>
            </div>
            <div className="h-1 bg-white/10 rounded-full overflow-hidden relative">
                {center && <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/20" />}
                <div
                    className="h-full bg-blue-500/80 rounded-full transition-all duration-75"
                    style={{ width: `${Math.abs(center ? (value / range) * 100 : pct)}%`, marginLeft: center && value < 0 ? 'auto' : (center ? '50%' : '0'), marginRight: center && value < 0 ? '50%' : 'auto' }}
                />
                {/* Simplified bar logic for center/non-center mixed is tricky in one div.
                    Let's use the ControlPanel logic but simpler.
                */}
            </div>
            {/* Re-implementing bar logic cleanly */}
            <div className="h-1.5 bg-white/5 rounded-full relative mt-1">
                {center && <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-white/10 -ml-px" />}
                <div
                    className="absolute top-0 bottom-0 bg-blue-500 transition-all duration-100 rounded-full"
                    style={{
                        left: center
                            ? (value < 0 ? `${50 + (value / 1 * 50)}%` : '50%')
                            : '0%',
                        width: center
                            ? `${Math.abs(value) * 50}%`
                            : `${pct}%`,
                    }}
                />
            </div>
        </div>
    )
}
