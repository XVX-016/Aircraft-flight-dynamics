"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { simulationEngine } from "@/lib/simulation/simulation-engine";
import { ExtendedKalmanFilter } from "@/lib/simulation/estimation/ekf-core";
import { GPS } from "@/lib/simulation/estimation/sensors";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useSimulationStore } from "@/stores/useSimulationStore";
import FaultControlPanel from "@/components/estimation/FaultControlPanel";
import { Play, Pause, RotateCcw, Cpu, Activity, ShieldCheck, ShieldAlert, ChevronRight, FastForward } from "lucide-react";
import * as math from "mathjs";
import { ValidationSystem, ValidationMetrics, ObservabilityResult } from "@/lib/simulation/ValidationSystem";
import { adversarialNoiseGenerator } from "@/lib/simulation/estimation/adversarial/AdversarialNoise";
import { Matrix } from "ml-matrix";

// Instances
const ekf = new ExtendedKalmanFilter();
const gps = new GPS();
const validator = new ValidationSystem(simulationEngine);

export default function EstimationValidationLab() {
    // --- State ---
    const [simTime, setSimTime] = useState(0);
    const [paused, setPaused] = useState(true);
    const [metrics, setMetrics] = useState<ValidationMetrics | null>(null);
    const [obsResult, setObsResult] = useState<ObservabilityResult | null>(null);
    const [history, setHistory] = useState<any[]>([]);

    // 3D Scene State
    const setScene = useSimulationStore((state) => state.setScene);
    const setEstimationData = useSimulationStore((state) => state.setEstimationData);

    // --- Deterministic Step ---
    const step = useCallback((dt: number) => {
        // 1. Core Simulation Step (Deterministic)
        // Accessing private engines via public API implies we trust their internal state consistency
        // Ideally we would pass 'state' explicitly, but our engines are singletons/stateful for this app.
        // We assume simulationEngine updates its internal state on 'update' or we use 'predictDeterminstic' logic.
        // For the main loop, we need the simulation to advance.
        simulationEngine.update(dt);
        const truth = simulationEngine.getRenderState(0);

        // 2. EKF Cycle
        ekf.predict(simulationEngine.getControls(), dt);

        let meas = gps.measure(truth, dt, simTime + dt);
        let innov = [0, 0, 0]; // For NIS

        const F = validator.computeSystemMatrix(truth, dt); // Numerical Jacobian for A
        const H_val = validator.computeMeasurementMatrix(); // For Observability Analysis

        if (meas) {
            const H_ekf = GPS.getJacobian(); // Analytical H for EKF

            // Adversarial Noise Injection
            const v_adv = adversarialNoiseGenerator.computeNoise(H_ekf, meas.R);
            meas.z = meas.z.map((val, i) => val + (v_adv[i] || 0));

            ekf.update(meas, H_ekf);

            // Capture innovation for NIS
            // Simplified: Re-computing innovation since EKF might not expose it directly in public API efficiently
            const estPos = ekf.getEstimate().xHat.p;
            innov = [
                meas.z[0] - estPos.x,
                meas.z[1] - estPos.y,
                meas.z[2] - estPos.z
            ];
        }

        // 3. Validation Analysis (CPU-Side)
        const est = ekf.getEstimate();
        const P_array = est.P;
        const P_matrix = new Matrix(P_array);

        // S = HPH' + R (Simplified for validation check)
        // We need S for NIS. 
        // Let's compute S explicitly here for validation trust
        const H_mat = new Matrix(3, 9); // GPS is 3x9
        H_mat.set(0, 0, 1); H_mat.set(1, 1, 1); H_mat.set(2, 2, 1); // Simple identity block

        const R_mat = Matrix.eye(3).mul(100); // R=100 from GPS config
        const S_mat = H_mat.mmul(P_matrix).mmul(H_mat.transpose()).add(R_mat);

        // Validations
        const metricSnapshot = validator.computeMetrics(
            [est.xHat.p.x, est.xHat.p.y, est.xHat.p.z], // Partial state for NEES demo
            [truth.p.x, truth.p.y, truth.p.z],
            P_matrix.subMatrix(0, 2, 0, 2), // Top-left 3x3 P
            innov,
            S_mat
        );
        setMetrics(metricSnapshot);

        const obsSnapshot = validator.analyzeObservability(F, H_val);
        setObsResult(obsSnapshot);

        // 4. Update Time
        setSimTime(t => t + dt);

        // 5. Update Global Store for Visualization (Bridge to SceneRoot)
        setEstimationData({
            estimatedState: {
                position: est.xHat.p,
                rotation: est.xHat.q // Assuming EKF state has quaternion
            },
            covariance: P_array // 9x9, but Visuals might slice it or we slice it here
        });

        // 6. History Logging
        setHistory(prev => {
            const nw = [...prev, {
                time: (simTime + dt).toFixed(1),
                nees: metricSnapshot.nees,
                nis: metricSnapshot.nis,
                nees_upper: metricSnapshot.neesBounds[1],
                nis_upper: metricSnapshot.nisBounds[1]
            }];
            if (nw.length > 50) nw.shift();
            return nw;
        });

    }, [simTime]);

    // --- Loop Control ---
    useEffect(() => {
        setScene('estimation');

        // Init engines
        try {
            const initTruth = simulationEngine.getInitialState();
            ekf.init(initTruth, (math.identity(19) as any).toArray());
        } catch (e) { console.warn("Init fallback"); }

    }, [setScene]);

    useEffect(() => {
        if (paused) return;
        const dt = 0.05; // 20Hz validation step

        // Use requestAnimationFrame for smooth UI, but logic is fixed step
        let animationFrameId: number;

        const loop = () => {
            step(dt);
            animationFrameId = requestAnimationFrame(loop);
        };
        loop();

        return () => cancelAnimationFrame(animationFrameId);
    }, [paused, step]);


    // --- UI Render ---
    return (
        <div className="min-h-screen bg-[#0a0a0b] text-slate-200 font-mono text-xs overflow-hidden flex flex-col pt-20">

            {/* ZONE 1: TOP CONTROL BAR */}
            <div className="h-14 border-b border-white/5 bg-black/40 backdrop-blur flex items-center px-6 justify-between shrink-0">
                <div className="flex items-center gap-6">
                    <h1 className="font-bold tracking-widest text-[#4ade80]">VALIDATION LAB <span className="text-slate-600">:: TQL-4</span></h1>
                    <div className="h-8 w-px bg-white/10" />

                    <button onClick={() => setPaused(!paused)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded">
                        {paused ? <Play className="w-3.5 h-3.5 text-green-400" /> : <Pause className="w-3.5 h-3.5 text-amber-400" />}
                        <span className="uppercase tracking-wider">{paused ? "Run" : "Halt"}</span>
                    </button>

                    <button onClick={() => step(0.05)} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded disabled:opacity-50" disabled={!paused}>
                        <ChevronRight className="w-3.5 h-3.5" />
                        <span>STEP</span>
                    </button>

                    <button onClick={() => { }} className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded">
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>RESET</span>
                    </button>
                </div>

                <div className="flex items-center gap-6">
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 uppercase">Sim Time</span>
                        <span className="text-lg font-bold text-white">{simTime.toFixed(2)}s</span>
                    </div>
                    <div className="flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 uppercase">Integrator</span>
                        <span className="text-emerald-500">RK4 / 100Hz</span>
                    </div>
                </div>
            </div>

            {/* MAIN WORKSPACE (3 ZONES) */}
            <div className="flex-1 flex overflow-hidden">

                {/* ZONE 2: LEFT MATH PANEL */}
                <div className="w-[400px] border-r border-white/5 bg-black/20 flex flex-col overflow-y-auto">

                    {/* Consistency Plots */}
                    <div className="p-4 border-b border-white/5">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-3.5 h-3.5 text-blue-400" />
                            <h3 className="font-bold tracking-wider text-slate-400">NEES CONSISTENCY</h3>
                        </div>
                        <div className="h-32 w-full bg-white/5 rounded border border-white/5 relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={history}>
                                    <CartesianGrid stroke="#222" strokeDasharray="2 2" />
                                    <YAxis hide domain={[0, 25]} />
                                    <Line type="monotone" dataKey="nees" stroke="#3b82f6" strokeWidth={2} dot={false} isAnimationActive={false} />
                                    <Line type="monotone" dataKey="nees_upper" stroke="#ef4444" strokeWidth={1} strokeDasharray="4 4" dot={false} isAnimationActive={false} />
                                </LineChart>
                            </ResponsiveContainer>
                            <div className="absolute top-2 right-2 flex gap-2">
                                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${metrics?.isConsistent ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'}`}>
                                    {metrics?.isConsistent ? "PASS" : "FAIL"}
                                </span>
                            </div>
                        </div>
                        <div className="mt-2 flex justify-between text-[10px] text-slate-600">
                            <span>Chi2 Lower: {metrics?.neesBounds[0].toFixed(2)}</span>
                            <span>Upper: {metrics?.neesBounds[1].toFixed(2)}</span>
                        </div>
                    </div>

                    {/* Matrix Monitor */}
                    <div className="p-4 space-y-4">
                        <div>
                            <h4 className="text-[10px] text-slate-500 uppercase mb-2 border-b border-white/5 pb-1">Covariance (P) Trace</h4>
                            <div className="font-mono text-[11px] text-slate-300">
                                Trace: {(ekf.getEstimate().P.reduce((sum, row, i) => sum + row[i], 0)).toExponential(4)}
                            </div>
                        </div>
                        <div>
                            <h4 className="text-[10px] text-slate-500 uppercase mb-2 border-b border-white/5 pb-1">Innovation (ν)</h4>
                            <div className="font-mono text-[11px] text-slate-300">
                                {metrics ? `[${metrics.nis.toFixed(3)}]` : "---"}
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto p-4 border-t border-white/5">
                        <FaultControlPanel />
                    </div>
                </div>

                {/* ZONE 3: CENTER GEOMETRY (The 3D Canvas is generally behind standard DOM, so this area is transparent) */}
                <div className="flex-1 relative pointer-events-none">
                    {/* 3D Scene is rendered by layout.tsx SceneRoot in background. 
                         We just leave this space open.
                         Maybe add simple Overlay HUD here?
                      */}
                    <div className="absolute top-4 left-4">
                        <div className="px-3 py-1 bg-black/50 backdrop-blur rounded border border-white/10 text-[10px] text-white/60">
                            CAM: TRACKING
                        </div>
                    </div>
                </div>

                {/* ZONE 4: RIGHT HEALTH PANEL */}
                <div className="w-[320px] border-l border-white/5 bg-black/20 flex flex-col p-4">
                    <div className="flex items-center gap-2 mb-6">
                        <ShieldCheck className="w-4 h-4 text-emerald-500" />
                        <h3 className="font-bold tracking-wider text-slate-100">SYSTEM HEALTH</h3>
                    </div>

                    {/* Observability */}
                    <div className="mb-6">
                        <label className="text-[10px] uppercase text-slate-500 block mb-2">Observability Rank</label>
                        <div className="flex items-end gap-2 mb-2">
                            <span className="text-4xl font-light text-white">{obsResult?.rank ?? "-"}</span>
                            <span className="text-sm text-slate-500 mb-1">/ 9</span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className="h-full bg-blue-500 transition-all duration-300"
                                style={{ width: `${((obsResult?.rank || 0) / 9) * 100}%` }}
                            />
                        </div>
                    </div>

                    {/* Condition Number */}
                    <div className="mb-6">
                        <label className="text-[10px] uppercase text-slate-500 block mb-2">Condition Number</label>
                        <div className="font-mono text-lg text-amber-400">
                            {obsResult?.conditionNumber.toExponential(2) ?? "---"}
                        </div>
                        <p className="text-[10px] text-slate-600 mt-1">
                            &gt; 1e4 implies weak observability
                        </p>
                    </div>

                    {/* Active Faults List */}
                    <div className="flex-1">
                        <label className="text-[10px] uppercase text-slate-500 block mb-2 border-b border-white/5 pb-1">Active Hazards</label>
                        <div className="space-y-2 mt-2">
                            {/* Simple mock of active faults based on switches - wired in next phase ideally */}
                            <div className="flex items-center gap-2 text-[10px] text-emerald-500 bg-emerald-500/10 px-2 py-1.5 rounded">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                SYSTEM NOMINAL
                            </div>
                        </div>
                    </div>

                    <div className="mt-auto border-t border-white/5 pt-4">
                        <button
                            onClick={() => {
                                if (!metrics || !obsResult) return;
                                // Re-compute F if needed or store it?
                                // Ideally we capture F from the last step.
                                // But `step` function variables F are local.
                                // We need to store F in state or re-compute.
                                // Let's re-compute for the report snapshot (valid for current state).
                                const truth = simulationEngine.getRenderState(0);
                                const F = validator.computeSystemMatrix(truth, 0.05);

                                import('@/lib/validation/ValidationReportGenerator').then(mod => {
                                    mod.ValidationReportGenerator.generateReport({
                                        trimId: `M${truth.mach.toFixed(2)} / AoA ${truth.alpha.toFixed(1)}°`,
                                        F: F.toArray(),
                                        consistency: {
                                            nees: metrics.nees,
                                            nis: metrics.nis,
                                            bounds: {
                                                nees95: metrics.neesBounds[1],
                                                nis95: metrics.nisBounds[1]
                                            }
                                        },
                                        observability: {
                                            // Extract singular values either from obsResult or re-analysis
                                            // obsResult has 'observableEnergy' = min SV.
                                            // We don't have full SV list in ObservabilityResult unless we add it.
                                            // Let's add it to ObservabilityResult or re-compute.
                                            // Simpler: Add singularValues to ObservabilityResult.
                                            singularValues: [obsResult.observableEnergy] // Placeholder until we expand interface
                                        }
                                    });
                                });
                            }}
                            className="w-full py-2 bg-white/5 hover:bg-white/10 text-xs font-bold tracking-widest uppercase rounded border border-white/10 transition-colors">
                            Generate Report
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}
