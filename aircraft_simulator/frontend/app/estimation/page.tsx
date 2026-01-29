"use client";

import { useEffect, useState, useRef } from "react";
import Navigation from "@/components/pilot/Navigation";
import { simulationEngine } from "@/lib/simulation/simulation-engine";
import { ExtendedKalmanFilter } from "@/lib/simulation/estimation/ekf-core";
import { GPS } from "@/lib/simulation/estimation/sensors";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import defaultAircraft from "@/lib/simulation/data/default_aircraft.json";

// Instantiate EKF (Ideally inside Engine, but for this page we can run a local instance or mirror)
// The Blueprint says EKF is part of the system.
// Let's assume we run strict separation: Engine produces Truth. EKF consumes measurements.
// For this Demo Page, we can run the loop LOCALLY using truth data from the Engine singleton.

const ekf = new ExtendedKalmanFilter();
const gps = new GPS();

export default function EstimationPage() {
    const [history, setHistory] = useState<any[]>([]);
    const [paused, setPaused] = useState(false);

    useEffect(() => {
        // Init EKF
        ekf.init(simulationEngine.getInitialState(), (math.identity(19) as any).toArray() as number[][]); // Hack to access getInitialState? 
        // Actually SimulationEngine private.
        // Re-init with defaults.

        const interval = setInterval(() => {
            if (paused) return;

            // 1. Get Truth
            const truth = simulationEngine.getRenderState(0); // Latest

            // 2. Predict (using controls from engine)
            ekf.predict(simulationEngine.getControls(), 0.05); // 20Hz update for UI

            // 3. Measure & Update (GPS)
            // Only update GPS every N frames ideally
            const meas = gps.measure(truth, 0.05);
            if (meas) {
                ekf.update(meas, GPS.getJacobian());
            }

            // 4. Get Estimate
            const est = ekf.getEstimate().xHat;

            // 5. Log
            setHistory(prev => {
                const nw = [...prev, {
                    time: Date.now(),
                    true_alt: -truth.p.z,
                    est_alt: -est.p.z,
                    true_vel: truth.v.x,
                    est_vel: est.v.x
                }];
                if (nw.length > 100) nw.shift();
                return nw;
            });

        }, 50); // 20Hz UI loop

        return () => clearInterval(interval);
    }, [paused]);

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            <Navigation />

            <main className="pt-24 px-8 pb-12 max-w-[1920px] mx-auto">
                <header className="mb-8">
                    <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">State Estimation</h1>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Extended Kalman Filter (EKF)</h2>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Altitude Plot */}
                    <div className="hud-panel h-[400px]">
                        <h3 className="text-sm font-mono text-white/70 mb-4">Altitude Tracking (True vs Est)</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="time" hide />
                                <YAxis stroke="#666" domain={['auto', 'auto']} />
                                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                                <Legend />
                                <Line type="monotone" dataKey="true_alt" stroke="#4ade80" strokeWidth={2} dot={false} name="Truth" />
                                <Line type="monotone" dataKey="est_alt" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Estimate" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>

                    {/* Velocity Plot */}
                    <div className="hud-panel h-[400px]">
                        <h3 className="text-sm font-mono text-white/70 mb-4">Velocity Tracking (True vs Est)</h3>
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={history}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                <XAxis dataKey="time" hide />
                                <YAxis stroke="#666" domain={['auto', 'auto']} />
                                <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333' }} />
                                <Legend />
                                <Line type="monotone" dataKey="true_vel" stroke="#60a5fa" strokeWidth={2} dot={false} name="Truth" />
                                <Line type="monotone" dataKey="est_vel" stroke="#f59e0b" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Estimate" />
                            </LineChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </main>
        </div>
    );
}

// Needed imports for EKF usage
import * as math from "mathjs";
