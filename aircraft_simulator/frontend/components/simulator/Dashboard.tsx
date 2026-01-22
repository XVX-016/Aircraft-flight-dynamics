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
            <main className="flex-1 overflow-y-auto p-8">
                <div className="grid grid-cols-12 gap-8 h-full">

                    {/* Left Column: 3D View & Recent Sims */}
                    <div className="col-span-12 lg:col-span-8 space-y-8">
                        <AircraftView />

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Card title="Recent Altitude Test" className="hover:border-primary/50 transition-colors cursor-pointer">
                                <div className="flex items-center space-x-4">
                                    <div className="w-16 h-16 bg-slate-900 rounded border border-slate-800 flex items-center justify-center">
                                        <span className="text-primary font-bold">#23</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-200">LQR Stability Check</h4>
                                        <p className="text-xs text-slate-500">2 hours ago • NOMINAL</p>
                                    </div>
                                </div>
                            </Card>
                            <Card title="Gain Scheduling Validation" className="hover:border-primary/50 transition-colors cursor-pointer">
                                <div className="flex items-center space-x-4">
                                    <div className="w-16 h-16 bg-slate-900 rounded border border-slate-800 flex items-center justify-center">
                                        <span className="text-warning font-bold">#22</span>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-semibold text-slate-200">Monte Carlo Run</h4>
                                        <p className="text-xs text-slate-500">5 hours ago • RMSE: 0.12</p>
                                    </div>
                                </div>
                            </Card>
                        </div>

                        <button className="w-full py-4 bg-primary hover:bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/10 transition-all active:scale-[0.98]">
                            QUICK-START NEW SIMULATION
                        </button>
                    </div>

                    {/* Right Column: Telemetry & Controls */}
                    <div className="col-span-12 lg:col-span-4 space-y-8 h-full flex flex-col">
                        <div className="flex-1">
                            <TelemetryCharts />
                        </div>
                        <div className="shrink-0">
                            <ControlPanel />
                        </div>
                    </div>

                </div>
            </main>
        </div>
    );
}
