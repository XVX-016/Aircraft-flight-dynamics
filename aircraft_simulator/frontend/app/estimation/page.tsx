"use client";

import { useEffect, useState, useRef } from "react";
import { simulationEngine } from "@/lib/simulation/simulation-engine";
import { ExtendedKalmanFilter } from "@/lib/simulation/estimation/ekf-core";
import { GPS } from "@/lib/simulation/estimation/sensors";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ReferenceLine } from 'recharts';
import { useSimulationStore } from "@/stores/useSimulationStore";
import { ConsistencyTracker, ConsistencyHistory } from "@/lib/simulation/estimation/ConsistencyMetrics";
import FaultControlPanel from "@/components/estimation/FaultControlPanel";
import { NEESPlot, NISPlot } from "@/components/estimation/ConsistencyPlots";
import { Play, Pause, RotateCcw, Cpu, Activity } from "lucide-react";
import * as math from "mathjs";

import { adversarialNoiseGenerator } from "@/lib/simulation/estimation/adversarial/AdversarialNoise";

const ekf = new ExtendedKalmanFilter();
const gps = new GPS();
const consistencyTracker = new ConsistencyTracker(6, 3); // 6 state DoF, 3 measurement DoF

export default function EstimationStressLab() {
    const [history, setHistory] = useState<any[]>([]);
    const [paused, setPaused] = useState(true);
    const [simTime, setSimTime] = useState(0);
    const [consistencyHistory, setConsistencyHistory] = useState<ConsistencyHistory>(consistencyTracker.getHistory());

    const setScene = useSimulationStore((state) => state.setScene);

    useEffect(() => {
        setScene('estimation');
    }, [setScene]);

    const resetSim = () => {
        setHistory([]);
        setSimTime(0);
        consistencyTracker.clear();
        setConsistencyHistory(consistencyTracker.getHistory());
        // Re-init EKF
        try {
            ekf.init(simulationEngine.getInitialState(), (math.identity(19) as any).toArray() as number[][]);
        } catch (e) {
            console.warn("EKF init fallback");
        }
    };

    useEffect(() => {
        // Init EKF on mount
        try {
            ekf.init(simulationEngine.getInitialState(), (math.identity(19) as any).toArray() as number[][]);
        } catch (e) {
            console.warn("EKF init fallback");
        }

        const interval = setInterval(() => {
            if (paused) return;

            const dt = 0.05; // 20Hz
            setSimTime(t => t + dt);

            // 1. Get Truth
            const truth = simulationEngine.getRenderState(0);

            // 2. Predict
            ekf.predict(simulationEngine.getControls(), dt);

            // 3. Measure & Update (GPS)
            let meas = gps.measure(truth, dt);
            if (meas) {
                const H = GPS.getJacobian();
                const v_adv = adversarialNoiseGenerator.computeNoise(H, meas.R);
                // Apply noise: z = z + v_adv
                meas.z = meas.z.map((val, i) => val + (v_adv[i] || 0));

                ekf.update(meas, H);
            }

            // 4. Get Estimate
            const est = ekf.getEstimate().xHat;
            const P = ekf.getEstimate().P;

            // 5. Record consistency (simplified — using position sub-block)
            const truePos = [truth.p.x, truth.p.y, truth.p.z];
            const estPos = [est.p.x, est.p.y, est.p.z];
            const trueVel = [truth.v.x, truth.v.y, truth.v.z];
            const estVel = [est.v.x, est.v.y, est.v.z];

            // For demo, use identity as placeholder covariance
            const dummyCov = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
            consistencyTracker.record(
                simTime,
                [...truePos, ...trueVel],
                [...estPos, ...estVel],
                // Simplified 6x6 covariance block 
                [
                    [1, 0, 0, 0, 0, 0],
                    [0, 1, 0, 0, 0, 0],
                    [0, 0, 1, 0, 0, 0],
                    [0, 0, 0, 1, 0, 0],
                    [0, 0, 0, 0, 1, 0],
                    [0, 0, 0, 0, 0, 1],
                ],
                meas ? [meas.z[0] - est.p.x, meas.z[1] - est.p.y, meas.z[2] - est.p.z] : [0, 0, 0],
                dummyCov
            );
            setConsistencyHistory({ ...consistencyTracker.getHistory() });

            // 6. Log for plots
            setHistory(prev => {
                const nw = [...prev, {
                    time: simTime.toFixed(1),
                    true_alt: -truth.p.z,
                    est_alt: -est.p.z,
                    error_alt: Math.abs(-truth.p.z - (-est.p.z)),
                    true_vel: truth.v.x,
                    est_vel: est.v.x
                }];
                if (nw.length > 200) nw.shift();
                return nw;
            });

        }, 50);

        return () => clearInterval(interval);
    }, [paused, simTime]);

    return (
        <div className="min-h-screen bg-background text-foreground relative">
            <main className="pt-24 px-8 pb-12 max-w-[1920px] mx-auto">
                {/* Header */}
                <header className="mb-8">
                    <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">Stage 1</h1>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Estimation Stress Lab</h2>
                    <p className="text-sm text-slate-400 mt-2">
                        Inject sensor faults. Observe estimator behavior. Validate consistency.
                    </p>
                </header>

                {/* Controls Bar */}
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => setPaused(!paused)}
                        className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-colors ${paused
                            ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/30'
                            : 'bg-rose-500/20 text-rose-400 border border-rose-500/30 hover:bg-rose-500/30'
                            }`}
                    >
                        {paused ? <Play className="w-3 h-3" /> : <Pause className="w-3 h-3" />}
                        {paused ? 'Run' : 'Pause'}
                    </button>
                    <button
                        onClick={resetSim}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg font-bold text-[11px] uppercase tracking-wider border border-slate-700 transition-colors"
                    >
                        <RotateCcw className="w-3 h-3" />
                        Reset
                    </button>
                    <div className="flex-1" />
                    <div className="flex items-center gap-2 text-[11px] font-mono text-slate-400">
                        <Cpu className="w-3 h-3" />
                        t = {simTime.toFixed(1)}s
                    </div>
                </div>

                {/* Main Grid */}
                <div className="grid grid-cols-12 gap-6">
                    {/* Left Column — Fault Controls */}
                    <div className="col-span-3">
                        <FaultControlPanel />
                    </div>

                    {/* Center — State Tracking Plots */}
                    <div className="col-span-6 space-y-6">
                        {/* Altitude Plot */}
                        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 h-[280px]">
                            <div className="flex items-center gap-2 mb-4">
                                <Activity className="w-4 h-4 text-emerald-400" />
                                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">Altitude Tracking</h3>
                            </div>
                            <ResponsiveContainer width="100%" height="85%">
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="time" stroke="#666" fontSize={10} />
                                    <YAxis stroke="#666" domain={['auto', 'auto']} fontSize={10} />
                                    <Tooltip contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: 11 }} />
                                    <Legend wrapperStyle={{ fontSize: 10 }} />
                                    <Line type="monotone" dataKey="true_alt" stroke="#4ade80" strokeWidth={2} dot={false} name="Truth" />
                                    <Line type="monotone" dataKey="est_alt" stroke="#ef4444" strokeWidth={2} dot={false} strokeDasharray="5 5" name="Estimate" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>

                        {/* Error Plot */}
                        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 h-[200px]">
                            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100 mb-4">Altitude Error (|True - Est|)</h3>
                            <ResponsiveContainer width="100%" height="85%">
                                <LineChart data={history}>
                                    <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                                    <XAxis dataKey="time" stroke="#666" fontSize={10} />
                                    <YAxis stroke="#666" domain={[0, 'auto']} fontSize={10} />
                                    <Line type="monotone" dataKey="error_alt" stroke="#f59e0b" strokeWidth={2} dot={false} name="Error" />
                                </LineChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Right Column — Consistency Diagnostics */}
                    <div className="col-span-3 space-y-6">
                        <NEESPlot history={consistencyHistory} />
                        <NISPlot history={consistencyHistory} />
                    </div>
                </div>
            </main>
        </div>
    );
}
