"use client";

import { useState } from 'react';
import { useSim } from '@/lib/providers/SimProvider';

const ControlPanel = () => {
    const { setControls } = useSim();

    // Local state for controls display (since SimProvider manages actual control input)
    const [controls, setLocalControls] = useState({
        throttle: 0.5,
        elevator: 0,
        aileron: 0,
        rudder: 0
    });

    const handleControlChange = (id: string, value: number) => {
        setLocalControls(prev => ({ ...prev, [id]: value }));
        setControls({ [id]: value });
    };

    const axes = [
        { label: 'THR', id: 'throttle', color: 'bg-white' },
        { label: 'PIT', id: 'elevator', color: 'bg-blue-500' },
        { label: 'ROL', id: 'aileron', color: 'bg-purple-500' },
        { label: 'YAW', id: 'rudder', color: 'bg-amber-500' },
    ];

    return (
        <div className="bg-black/30 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)] animate-slide-in-right z-20" style={{ animationDelay: '0.4s' }}>
            <div className="flex items-center gap-2 mb-6">
                <span className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase">Manual Control</span>
            </div>

            <div className="space-y-7">
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

export default ControlPanel;
