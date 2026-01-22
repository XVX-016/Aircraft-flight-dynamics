'use client';

import { AircraftView } from './3DViewer/AircraftView';
import { TelemetryCharts } from './Telemetry/TelemetryCharts';
import { ControlPanel } from './Controls/ControlPanel';
import { Card } from '@/components/ui/Card';

export function Dashboard() {
    return (
        <div className="flex-1 flex flex-col h-full bg-background overflow-hidden">
            {/* Top Header */}
            <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 shrink-0">
                <h1 className="text-lg font-semibold text-slate-200">Welcome, Lead Engineer</h1>
                <div className="flex items-center space-x-4">
                    <div className="px-3 py-1 bg-success/10 text-success text-[10px] font-bold rounded border border-success/20 uppercase tracking-widest">
                        System Online
                    </div>
                    <div className="px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold rounded border border-primary/20 uppercase tracking-widest">
                        Simulation Ready
                    </div>
                </div>
            </header>

            {/* Main Content Area */}
            <main className="flex-1 overflow-y-auto p-8 hud-grid">
                <div className="grid grid-cols-12 gap-8 h-full max-w-[1600px] mx-auto">

                    {/* Left Column: 3D View & Quick Actions (70% - 8 cols) */}
                    <div className="col-span-12 lg:col-span-8 space-y-8 flex flex-col">
                        <div className="flex-1 min-h-[500px] rounded-3xl overflow-hidden border border-slate-800 shadow-[inset_0_0_50px_rgba(0,0,0,0.5)] bg-black relative group">
                            <AircraftView />
                            {/* HUD Overlays */}
                            <div className="absolute top-6 left-6 pointer-events-none space-y-1">
                                <p className="text-[10px] font-mono text-primary uppercase tracking-[0.2em] opacity-70">Telemetry Feed 01</p>
                                <div className="flex items-center space-x-2">
                                    <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
                                    <span className="text-xs font-mono text-slate-300 uppercase tracking-widest">Live Integration</span>
                                </div>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <Card title="Mission Profile" className="hover:border-primary/40 transition-all group">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-200 group-hover:text-primary transition-colors">LQR Stability Check</h4>
                                        <p className="text-[10px] text-slate-500 font-mono">ID: SIM-23-ALPHA</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-mono text-success">NOMINAL</p>
                                        <p className="text-[9px] text-slate-600 font-mono">0.02s LATENCY</p>
                                    </div>
                                </div>
                            </Card>
                            <Card title="Robustness Analysis" className="hover:border-primary/40 transition-all group">
                                <div className="flex items-center justify-between">
                                    <div className="space-y-1">
                                        <h4 className="text-sm font-bold text-slate-200 group-hover:text-primary transition-colors">Monte Carlo Run</h4>
                                        <p className="text-[10px] text-slate-500 font-mono">ID: SIM-22-BETA</p>
                                    </div>
                                    <div className="text-right">
                                        <p className="text-xs font-mono text-warning">EKF DRIFT</p>
                                        <p className="text-[9px] text-slate-600 font-mono">RMSE: 0.12</p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <button className="w-full py-5 bg-primary hover:bg-indigo-600 text-white font-bold text-sm tracking-[0.2em] rounded-2xl shadow-2xl shadow-indigo-500/20 transition-all active:scale-[0.99] uppercase">
                            Initialize New Simulation Session
                        </button>
                    </div>

                    {/* Right Column: Telemetry & Controls (30% - 4 cols) */}
                    <div className="col-span-12 lg:col-span-4 space-y-8 flex flex-col">
                        <TelemetryCharts />
                        <div className="mt-auto">
                            <ControlPanel />
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
