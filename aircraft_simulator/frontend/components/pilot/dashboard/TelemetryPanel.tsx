"use client";

import { useState } from 'react';
import { useSim } from '@/lib/providers/SimProvider';

export default function TelemetryPanel() {
    const [activeTab, setActiveTab] = useState<'flight' | 'inputs' | 'ekf'>('flight');
    const { derived, truthState, estimate } = useSim();

    // Safe defaults if state not yet available
    const altitude = derived?.altitude ?? 0;
    const airspeed = derived?.airspeed ?? 0;
    const aoa = derived?.aoa ?? 0;

    // Euler angles from quaternion (simplified approximation)
    const roll = truthState ? Math.atan2(2 * (truthState.q.w * truthState.q.x + truthState.q.y * truthState.q.z), 1 - 2 * (truthState.q.x ** 2 + truthState.q.y ** 2)) * 180 / Math.PI : 0;
    const pitch = truthState ? Math.asin(2 * (truthState.q.w * truthState.q.y - truthState.q.z * truthState.q.x)) * 180 / Math.PI : 0;
    const yaw = truthState ? Math.atan2(2 * (truthState.q.w * truthState.q.z + truthState.q.x * truthState.q.y), 1 - 2 * (truthState.q.y ** 2 + truthState.q.z ** 2)) * 180 / Math.PI : 0;

    return (
        <div className="bg-black/30 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)] animate-slide-in-right z-20">
            {/* Header / Tabs */}
            <div className="flex items-center gap-6 mb-8 border-b border-white/5 pb-3">
                <button
                    onClick={() => setActiveTab('flight')}
                    className={`text-[10px] font-mono tracking-[0.3em] uppercase transition-colors ${activeTab === 'flight' ? 'text-white/90' : 'text-white/20 hover:text-white/40'}`}
                >
                    Flight
                </button>
                <button
                    onClick={() => setActiveTab('inputs')}
                    className={`text-[10px] font-mono tracking-[0.3em] uppercase transition-colors ${activeTab === 'inputs' ? 'text-white/90' : 'text-white/20 hover:text-white/40'}`}
                >
                    Inputs
                </button>
                <button
                    onClick={() => setActiveTab('ekf')}
                    className={`text-[10px] font-mono tracking-[0.3em] uppercase transition-colors ${activeTab === 'ekf' ? 'text-white/90' : 'text-white/20 hover:text-white/40'}`}
                >
                    EKF
                </button>
            </div>

            <div className="min-h-[220px]">
                {activeTab === 'flight' && (
                    <div className="space-y-7">
                        <MetricRow label="Altitude" value={altitude.toFixed(0)} unit="FT" />
                        <MetricRow label="Airspeed" value={airspeed.toFixed(0)} unit="M/S" />
                        <MetricRow label="Heading" value={yaw.toFixed(0)} unit="DEG" />
                        <div className="grid grid-cols-2 gap-6">
                            <MetricRow label="Roll" value={roll.toFixed(1)} unit="°" />
                            <MetricRow label="Pitch" value={pitch.toFixed(1)} unit="°" />
                        </div>
                        <MetricRow label="AoA" value={(aoa * 180 / Math.PI).toFixed(1)} unit="°" />
                    </div>
                )}

                {activeTab === 'inputs' && (
                    <div className="space-y-4 text-[10px] font-mono text-white/40 tracking-widest leading-relaxed">
                        <p>Control Link Status: <span className="text-emerald-500/80">ESTABLISHED</span></p>
                        <p>Manual Override: <span className="text-white/20">DISABLED</span></p>
                    </div>
                )}

                {activeTab === 'ekf' && (
                    <div className="space-y-4 text-[10px] font-mono tracking-widest text-white/60">
                        <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-lg border border-white/5">
                            <span className="text-white/30">STATUS</span>
                            <span className="text-emerald-400/80">CONVERGED</span>
                        </div>
                        <div className="flex justify-between items-center bg-white/[0.02] p-3 rounded-lg border border-white/5">
                            <span className="text-white/30">ESTIMATE COVARIANCE</span>
                            {/* Display Trace of P as a simple metric */}
                            <span className="text-white/80">
                                {estimate ? (
                                    (estimate.covariance[0][0] + estimate.covariance[1][1] + estimate.covariance[2][2]).toExponential(2)
                                ) : "INIT"}
                            </span>
                        </div>
                        <div className="mt-6">
                            <p className="text-white/20 mb-3 text-[9px]">DIAGONAL COVARIANCE (Pos/Vel)</p>
                            <div className="flex gap-1.5 h-10 items-end px-1">
                                {estimate?.covariance.slice(0, 6).map((row, i) => (
                                    <div key={i} className="flex-1 bg-emerald-500/30 rounded-t-sm" style={{ height: `${Math.min(100, Math.sqrt(row[i]) * 50)}%` }} />
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
            <div className="flex justify-between items-end mb-1.5">
                <span className="text-[10px] uppercase tracking-[0.2em] font-mono text-white/40 italic">{label}</span>
                <div className="flex items-baseline gap-1.5">
                    <span className="text-lg font-mono text-white/85 tracking-tight">
                        {value}
                    </span>
                    <span className="text-[9px] font-mono text-white/20 uppercase">{unit}</span>
                </div>
            </div>
            <div className="h-[1px] w-full bg-gradient-to-r from-white/10 via-white/5 to-transparent" />
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
