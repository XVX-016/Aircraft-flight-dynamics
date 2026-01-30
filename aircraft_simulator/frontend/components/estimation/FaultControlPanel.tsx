"use client";

import { useState } from 'react';
import { faultInjector, FaultConfig, FaultType } from '@/lib/simulation/faults';
import { adversarialNoiseGenerator } from '@/lib/simulation/estimation/adversarial/AdversarialNoise';
import { AlertTriangle, Zap, Radio, Gauge } from 'lucide-react';

interface FaultControlProps {
    onFaultChange?: () => void;
}

export default function FaultControlPanel({ onFaultChange }: FaultControlProps) {
    const [activeFaults, setActiveFaults] = useState<Record<string, FaultConfig[]>>({
        imu_accel: [],
        imu_gyro: [],
        gps_pos: [],
        baro: []
    });

    const [newFault, setNewFault] = useState({
        sensor: 'imu_accel',
        type: 'bias_step' as FaultType,
        startTime: 5,
        duration: 10,
        magnitude: 0.5,
        axis: 'x' as 'x' | 'y' | 'z'
    });

    const [advEnabled, setAdvEnabled] = useState(false);
    const [advStrength, setAdvStrength] = useState(0);

    const addFault = () => {
        const fault: FaultConfig = {
            type: newFault.type,
            startTime: newFault.startTime,
            duration: newFault.duration,
            magnitude: newFault.magnitude,
            axis: newFault.axis
        };

        const sensor = newFault.sensor as 'imu_accel' | 'imu_gyro' | 'gps_pos' | 'gps_vel' | 'baro' | 'mag';
        faultInjector.setFaults(sensor, [...(activeFaults[newFault.sensor] || []), fault]);

        setActiveFaults(prev => ({
            ...prev,
            [newFault.sensor]: [...(prev[newFault.sensor] || []), fault]
        }));

        onFaultChange?.();
    };

    const clearAllFaults = () => {
        faultInjector.clearFaults();
        setActiveFaults({
            imu_accel: [],
            imu_gyro: [],
            gps_pos: [],
            baro: []
        });
        onFaultChange?.();
    };

    const sensorOptions = [
        { id: 'imu_accel', label: 'IMU Accel', icon: Gauge },
        { id: 'imu_gyro', label: 'IMU Gyro', icon: Radio },
        { id: 'gps_pos', label: 'GPS Pos', icon: Radio },
        { id: 'baro', label: 'Baro', icon: Gauge }
    ];

    const faultTypes: { id: FaultType; label: string; color: string }[] = [
        { id: 'bias_step', label: 'Bias Step', color: 'text-amber-400' },
        { id: 'bias_ramp', label: 'Bias Ramp', color: 'text-orange-400' },
        { id: 'dropout', label: 'Dropout', color: 'text-red-400' },
        { id: 'freeze', label: 'Freeze', color: 'text-blue-400' }
    ];

    return (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">Fault Injection</h3>
            </div>

            {/* Sensor Select */}
            <div className="mb-4">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2">Sensor</label>
                <div className="grid grid-cols-2 gap-2">
                    {sensorOptions.map(s => (
                        <button
                            key={s.id}
                            onClick={() => setNewFault(f => ({ ...f, sensor: s.id }))}
                            className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] font-mono transition-colors ${newFault.sensor === s.id
                                ? 'bg-slate-700 border-slate-500 text-white'
                                : 'bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600'
                                }`}
                        >
                            <s.icon className="w-3 h-3" />
                            {s.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Fault Type */}
            <div className="mb-4">
                <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2">Fault Type</label>
                <div className="flex flex-wrap gap-2">
                    {faultTypes.map(ft => (
                        <button
                            key={ft.id}
                            onClick={() => setNewFault(f => ({ ...f, type: ft.id }))}
                            className={`px-3 py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-colors ${newFault.type === ft.id
                                ? `bg-slate-700 border-slate-500 ${ft.color}`
                                : 'bg-slate-800/50 border-slate-700/50 text-slate-500 hover:border-slate-600'
                                }`}
                        >
                            {ft.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Parameters */}
            <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Start (s)</label>
                    <input
                        type="number"
                        value={newFault.startTime}
                        onChange={e => setNewFault(f => ({ ...f, startTime: parseFloat(e.target.value) }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Duration (s)</label>
                    <input
                        type="number"
                        value={newFault.duration}
                        onChange={e => setNewFault(f => ({ ...f, duration: parseFloat(e.target.value) }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Magnitude</label>
                    <input
                        type="number"
                        step="0.1"
                        value={newFault.magnitude}
                        onChange={e => setNewFault(f => ({ ...f, magnitude: parseFloat(e.target.value) }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                    />
                </div>
                <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Axis</label>
                    <select
                        value={newFault.axis}
                        onChange={e => setNewFault(f => ({ ...f, axis: e.target.value as 'x' | 'y' | 'z' }))}
                        className="w-full bg-slate-800 border border-slate-700 rounded px-2 py-1.5 text-sm text-white"
                    >
                        <option value="x">X</option>
                        <option value="y">Y</option>
                        <option value="z">Z</option>
                    </select>
                </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
                <button
                    onClick={addFault}
                    className="flex-1 flex items-center justify-center gap-2 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-amber-500/30 transition-colors"
                >
                    <Zap className="w-3 h-3" />
                    Inject Fault
                </button>
                <button
                    onClick={clearAllFaults}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-400 text-[11px] font-bold uppercase tracking-wider rounded-lg border border-slate-700 transition-colors"
                >
                    Clear
                </button>
            </div>

            {/* Active Faults List */}
            {Object.entries(activeFaults).some(([, faults]) => faults.length > 0) && (
                <div className="mt-4 pt-4 border-t border-slate-700/50">
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider block mb-2">Active Faults</label>
                    <div className="space-y-1">
                        {Object.entries(activeFaults).map(([sensor, faults]) =>
                            faults.map((f, i) => (
                                <div key={`${sensor}-${i}`} className="flex items-center gap-2 text-[10px] font-mono text-slate-300 bg-slate-800/50 px-2 py-1 rounded">
                                    <span className="text-amber-400">{sensor}</span>
                                    <span className="text-slate-500">•</span>
                                    <span className={faultTypes.find(ft => ft.id === f.type)?.color}>{f.type}</span>
                                    <span className="text-slate-500">@ t={f.startTime}s</span>
                                </div>
                            ))
                        )}
                    </div>
                </div>
            )}

            {/* Adversarial Attack Section */}
            <div className="mt-4 pt-4 border-t border-slate-700/50">
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                        <Zap className="w-3 h-3 text-rose-500" />
                        <label className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Adversarial Attack</label>
                    </div>
                    <button
                        onClick={() => {
                            const current = adversarialNoiseGenerator.getConfig();
                            adversarialNoiseGenerator.configure({ enabled: !current.enabled });
                            setAdvEnabled(!advEnabled);
                        }}
                        className={`w-8 h-4 rounded-full transition-colors relative ${advEnabled ? 'bg-rose-500' : 'bg-slate-700'}`}
                    >
                        <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${advEnabled ? 'left-4.5' : 'left-0.5'}`} />
                    </button>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-mono text-slate-500 uppercase">
                        <span>Strength</span>
                        <span>{Math.round(advStrength * 100)}%</span>
                    </div>
                    <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.01"
                        value={advStrength}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value);
                            setAdvStrength(val);
                            adversarialNoiseGenerator.configure({ strength: val });
                        }}
                        className="w-full accent-rose-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                    />
                    <p className="text-[9px] text-slate-500 leading-tight italic">
                        Injects noise targeted at the weakest observability directions.
                    </p>
                </div>
            </div>
        </div>
    );
}
