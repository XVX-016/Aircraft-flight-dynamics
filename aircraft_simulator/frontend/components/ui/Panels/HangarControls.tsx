"use client";

import { useSimulationStore } from "@/stores/useSimulationStore";
import { Wind, Activity, Zap, Info } from "lucide-react";

export default function HangarControls() {
    const { orientation, updateState } = useSimulationStore();

    return (
        <div className="absolute top-24 right-8 w-80 bg-slate-900/40 backdrop-blur-xl border border-slate-700/50 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-blue-500/20 rounded-lg">
                    <Wind className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                    <h3 className="font-semibold text-slate-100">Virtual Wind Tunnel</h3>
                    <p className="text-xs text-slate-400">Flow Dynamics Analysis</p>
                </div>
            </div>

            <div className="space-y-6">
                {/* AoA Control */}
                <div>
                    <div className="flex justify-between mb-2">
                        <label className="text-sm font-medium text-slate-300">Angle of Attack (AoA)</label>
                        <span className="text-sm font-mono text-blue-400">
                            {(orientation[1] * (180 / Math.PI)).toFixed(1)}°
                        </span>
                    </div>
                    <input
                        type="range"
                        min="-20"
                        max="30"
                        step="0.1"
                        value={orientation[1] * (180 / Math.PI)}
                        onChange={(e) => {
                            const val = parseFloat(e.target.value) * (Math.PI / 180);
                            updateState({ orientation: [orientation[0], val, orientation[2]] });
                        }}
                        className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500"
                    />
                    <div className="flex justify-between mt-1 px-1">
                        <span className="text-[10px] text-slate-500">-20°</span>
                        <span className="text-[10px] text-slate-500">30°</span>
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
                        <div className="flex items-center gap-2 mb-1">
                            <Activity className="w-3 h-3 text-emerald-400" />
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Flow Status</span>
                        </div>
                        <p className="text-sm font-semibold text-emerald-400">
                            {Math.abs(orientation[1] * (180 / Math.PI)) > 15 ? "SEPARATED" : "LAMINAR"}
                        </p>
                    </div>
                    <div className="bg-slate-800/50 rounded-xl p-3 border border-slate-700/30">
                        <div className="flex items-center gap-2 mb-1">
                            <Zap className="w-3 h-3 text-amber-400" />
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Load Factor</span>
                        </div>
                        <p className="text-sm font-semibold text-slate-200">1.02 G</p>
                    </div>
                </div>

                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl flex gap-3">
                    <Info className="w-5 h-5 text-blue-400 shrink-0" />
                    <p className="text-[11px] text-blue-200/80 leading-relaxed">
                        Flow separation typically occurs above 15° AoA for this airframe profile. Watch for red turbulence in the viewport.
                    </p>
                </div>
            </div>
        </div>
    );
}
