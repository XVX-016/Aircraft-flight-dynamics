import { useState } from 'react';
import { useSim } from '@/lib/providers/SimProvider';
import { AutopilotMode } from "@/core/control/autopilot";

const ControlPanel = () => {
    const { setControls, autopilotMode, setAutopilotMode, setAutopilotTargets } = useSim();

    // Local state for controls display
    const [controls, setLocalControls] = useState({
        throttle: 0.5,
        elevator: 0,
        aileron: 0,
        rudder: 0
    });

    // Local state for targets
    const [targets, setTargets] = useState({
        altitude: 1000,
        heading: 0,
        speed: 60
    });

    const handleControlChange = (id: string, value: number) => {
        setLocalControls(prev => ({ ...prev, [id]: value }));
        setControls({ [id]: value });
    };

    const handleTargetChange = (id: string, value: number) => {
        setTargets(prev => ({ ...prev, [id]: value }));
        // Debounce or just set? For slider/input, setting on change is fine for this scale
        setAutopilotTargets({ [id]: value });
    };

    const axes = [
        { label: 'THR', id: 'throttle', color: 'bg-white' },
        { label: 'PIT', id: 'elevator', color: 'bg-blue-500' },
        { label: 'ROL', id: 'aileron', color: 'bg-purple-500' },
        { label: 'YAW', id: 'rudder', color: 'bg-amber-500' },
    ];

    return (
        <div className="bg-black/30 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)] animate-slide-in-right z-20" style={{ animationDelay: '0.4s' }}>

            {/* AUTOPILOT SECTION */}
            <div className="mb-8 border-b border-white/5 pb-6">
                <div className="flex items-center justify-between mb-4">
                    <span className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase">Autopilot</span>
                    <div className="flex gap-2">
                        {[
                            { label: 'OFF', mode: AutopilotMode.OFF },
                            { label: 'PID', mode: AutopilotMode.PID_SIMPLE },
                            { label: 'LQR', mode: AutopilotMode.LQR_HOLD },
                        ].map((btn) => (
                            <button
                                key={btn.label}
                                onClick={() => setAutopilotMode(btn.mode)}
                                className={`text-[9px] font-mono px-2 py-1 rounded border transition-colors ${autopilotMode === btn.mode
                                        ? 'bg-accent/20 border-accent/50 text-accent'
                                        : 'bg-white/5 border-white/10 text-white/40 hover:bg-white/10'
                                    }`}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="space-y-3">
                    <TargetInput label="ALT (m)" value={targets.altitude} onChange={(v) => handleTargetChange('altitude', v)} min={0} max={5000} step={100} />
                    <TargetInput label="HDG (deg)" value={targets.heading} onChange={(v) => handleTargetChange('heading', v)} min={-180} max={180} step={5} />
                    <TargetInput label="SPD (m/s)" value={targets.speed} onChange={(v) => handleTargetChange('speed', v)} min={30} max={100} step={1} />
                </div>
            </div>

            {/* MANUAL CONTROL SECTION */}
            <div className="flex items-center gap-2 mb-6">
                <span className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase">Manual Control</span>
                {autopilotMode !== AutopilotMode.OFF && <span className="text-[9px] text-amber-500/80 font-mono animate-pulse">OVERRIDDEN</span>}
            </div>

            <div className={`space-y-7 transition-opacity ${autopilotMode !== AutopilotMode.OFF ? 'opacity-50 pointer-events-none' : ''}`}>
                {axes.map((axis) => (
                    <div key={axis.id} className="space-y-3">
                        <div className="flex justify-between items-center">
                            <span className="text-[10px] font-mono text-white/20 uppercase tracking-[0.3em] italic">{axis.label}</span>
                            <span className="text-[11px] font-mono text-white/60 tracking-widest">{(controls[axis.id as keyof typeof controls] * 100).toFixed(0)}%</span>
                        </div>
                        <div className="relative h-[2px] bg-white/5 rounded-full overflow-hidden group">
                            <div
                                className={`h-full ${axis.color} opacity-40 transition-all duration-150 rounded-full shadow-[0_0_10px_rgba(255,255,255,0.1)]`}
                                style={{
                                    width: `${Math.abs(controls[axis.id as keyof typeof controls] * 100)}%`,
                                    marginLeft: axis.id !== 'throttle' ? (controls[axis.id as keyof typeof controls] < 0 ? '0' : '50%') : '0',
                                    left: axis.id !== 'throttle' ? (controls[axis.id as keyof typeof controls] < 0 ? 'auto' : '0') : '0',
                                    right: axis.id !== 'throttle' ? (controls[axis.id as keyof typeof controls] < 0 ? '50%' : 'auto') : 'auto'
                                }}
                            />
                            <input
                                type="range"
                                min={axis.id === 'throttle' ? 0 : -1}
                                max={1}
                                step="0.01"
                                value={controls[axis.id as keyof typeof controls]}
                                onChange={(e) => handleControlChange(axis.id, parseFloat(e.target.value))}
                                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                            />
                            <div
                                className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white/80 rounded-full shadow-[0_0_15px_rgba(255,255,255,0.4)] pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity"
                                style={{
                                    left: axis.id === 'throttle'
                                        ? `calc(${controls[axis.id as keyof typeof controls] * 100}% - 6px)`
                                        : `calc(${(controls[axis.id as keyof typeof controls] + 1) * 50}% - 6px)`
                                }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

function TargetInput({ label, value, onChange, min, max, step }: { label: string, value: number, onChange: (v: number) => void, min: number, max: number, step: number }) {
    return (
        <div className="flex justify-between items-center">
            <span className="text-[9px] font-mono text-white/30 uppercase tracking-widest">{label}</span>
            <div className="flex items-center gap-2">
                <input
                    type="range"
                    min={min} max={max} step={step}
                    value={value}
                    onChange={(e) => onChange(Number(e.target.value))}
                    className="w-24 h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-accent opacity-50 hover:opacity-100"
                />
                <span className="text-[10px] font-mono text-white/70 w-8 text-right">{value}</span>
            </div>
        </div>
    );
}

export default ControlPanel;
