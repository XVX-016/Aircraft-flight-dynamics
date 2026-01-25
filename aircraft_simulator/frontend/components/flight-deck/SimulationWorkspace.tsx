"use client";

import Viewport3D from "./Viewport3D";

export default function SimulationWorkspace() {
    return (
        <div className="flex h-screen w-screen bg-black overflow-hidden relative">
            {/* 3D Viewport Layer (Bottom) */}
            <Viewport3D />

            {/* UI Overlay Layer (Top) */}
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
                {/* Top Bar */}
                <div className="flex justify-between items-start pointer-events-auto">
                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-lg border border-slate-700 shadow-2xl">
                        <h1 className="text-xl font-bold text-sky-400 pixel-font">FLIGHT DECK</h1>
                        <p className="text-xs text-slate-400">Connected: Localhost</p>
                    </div>

                    <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-lg border border-slate-700 flex gap-4">
                        <div className="text-center">
                            <div className="text-xs text-slate-400 uppercase">Thrust</div>
                            <div className="text-lg font-mono text-emerald-400">54%</div>
                        </div>
                        <div className="w-px bg-slate-700"></div>
                        <div className="text-center">
                            <div className="text-xs text-slate-400 uppercase">Alt</div>
                            <div className="text-lg font-mono text-sky-400">1,240 ft</div>
                        </div>
                        <div className="w-px bg-slate-700"></div>
                        <div className="text-center">
                            <div className="text-xs text-slate-400 uppercase">Speed</div>
                            <div className="text-lg font-mono text-purple-400">145 kts</div>
                        </div>
                    </div>
                </div>

                {/* Bottom Dock */}
                <div className="flex justify-center pointer-events-auto">
                    <div className="bg-slate-900/80 backdrop-blur-md px-6 py-3 rounded-t-xl border-t border-x border-slate-700 shadow-2xl">
                        <span className="text-slate-400 text-sm">System Status: </span>
                        <span className="text-emerald-400 font-semibold text-sm">NOMINAL</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
