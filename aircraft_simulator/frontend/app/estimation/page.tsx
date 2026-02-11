"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { simulationEngine } from "@/lib/simulation/simulation-engine";
import { ExtendedKalmanFilter } from "@/lib/simulation/estimation/ekf-core";
import { GPS } from "@/lib/simulation/estimation/sensors";
import { LineChart, Line, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useSimulationStore } from "@/stores/useSimulationStore";
import FaultControlPanel from "@/components/estimation/FaultControlPanel";
import { Play, Pause, RotateCcw, Activity, ShieldCheck, ChevronRight, FileText, Loader2 } from "lucide-react";
import * as math from "mathjs";
import { ValidationSystem, ValidationMetrics, ObservabilityResult } from "@/lib/simulation/ValidationSystem";
import { adversarialNoiseGenerator } from "@/lib/simulation/estimation/adversarial/AdversarialNoise";
import { Matrix } from "ml-matrix";
import { AppContainer } from "@/components/ui/AppContainer";
import { toast } from "sonner";

const ekf = new ExtendedKalmanFilter();
const gps = new GPS();
const validator = new ValidationSystem(simulationEngine);

export default function EstimationValidationLab() {
    const [simTime, setSimTime] = useState(0);
    const [paused, setPaused] = useState(true);
    const [metrics, setMetrics] = useState<ValidationMetrics | null>(null);
    const [obsResult, setObsResult] = useState<ObservabilityResult | null>(null);
    const [history, setHistory] = useState<any[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    const setScene = useSimulationStore((state) => state.setScene);
    const setEstimationData = useSimulationStore((state) => state.setEstimationData);

    // Storage for report snapshots
    const latestF = useRef<Matrix | null>(null);

    const computeMach = (v: { x: number, y: number, z: number }) => {
        const speed = Math.sqrt(v.x ** 2 + v.y ** 2 + v.z ** 2);
        return speed / 340.29; // Speed of sound at sea level approx
    };

    const step = useCallback((dt: number) => {
        simulationEngine.update(dt);
        const truth = simulationEngine.getRenderState(0);

        ekf.predict(simulationEngine.getControls(), dt);

        let meas = gps.measure(truth, dt, simTime + dt);
        let innov = [0, 0, 0];

        const F = validator.computeSystemMatrix(truth, dt);
        latestF.current = F;
        const H_val = validator.computeMeasurementMatrix();

        if (meas) {
            const H_ekf = GPS.getJacobian();
            const v_adv = adversarialNoiseGenerator.computeNoise(H_ekf, meas.R);
            meas.z = meas.z.map((val, i) => val + (v_adv[i] || 0));

            ekf.update(meas, H_ekf);

            const estPos = ekf.getEstimate().xHat.p;
            innov = [
                meas.z[0] - estPos.x,
                meas.z[1] - estPos.y,
                meas.z[2] - estPos.z
            ];
        }

        const est = ekf.getEstimate();
        const P_array = est.P;
        const P_matrix = new Matrix(P_array);

        const H_mat = new Matrix(3, 9);
        H_mat.set(0, 0, 1); H_mat.set(1, 1, 1); H_mat.set(2, 2, 1);

        const R_mat = Matrix.eye(3).mul(100);
        const S_mat = H_mat.mmul(P_matrix).mmul(H_mat.transpose()).add(R_mat);

        const metricSnapshot = validator.computeMetrics(
            [est.xHat.p.x, est.xHat.p.y, est.xHat.p.z],
            [truth.p.x, truth.p.y, truth.p.z],
            P_matrix.subMatrix(0, 2, 0, 2),
            innov,
            S_mat
        );
        setMetrics(metricSnapshot);

        const obsSnapshot = validator.analyzeObservability(F, H_val);
        setObsResult(obsSnapshot);

        setSimTime(t => t + dt);

        setEstimationData({
            estimatedState: {
                position: est.xHat.p,
                rotation: est.xHat.q
            },
            covariance: P_array
        });

        setHistory(prev => {
            const nw = [...prev, {
                time: (simTime + dt).toFixed(1),
                nees: metricSnapshot.nees,
                nis: metricSnapshot.nis,
                nees_upper: metricSnapshot.neesBounds[1],
            }];
            if (nw.length > 50) nw.shift();
            return nw;
        });

    }, [simTime, setEstimationData]);

    useEffect(() => {
        setScene('estimation');
        try {
            const initTruth = simulationEngine.getInitialState();
            ekf.init(initTruth, (math.identity(19) as any).toArray());
        } catch (e) { }
    }, [setScene]);

    useEffect(() => {
        if (paused) return;
        const dt = 0.05;
        let animationFrameId: number;
        const loop = () => {
            step(dt);
            animationFrameId = requestAnimationFrame(loop);
        };
        loop();
        return () => cancelAnimationFrame(animationFrameId);
    }, [paused, step]);

    const handleExport = async () => {
        const F_mat = latestF.current;
        if (!metrics || !obsResult || !F_mat) {
            toast.error("No telemetry data available for report");
            return;
        }

        setIsExporting(true);
        const truth = simulationEngine.getRenderState(0);
        const machValue = computeMach(truth.v);
        const alphaDeg = (truth.alpha * 180 / Math.PI).toFixed(1);

        try {
            const mod = await import('@/lib/validation/ValidationReportGenerator');
            mod.ValidationReportGenerator.generateReport({
                trimId: `M${machValue.toFixed(2)} / AoA ${alphaDeg}°`,
                F: F_mat.to2DArray(),
                consistency: {
                    nees: metrics.nees,
                    nis: metrics.nis,
                    bounds: {
                        nees95: metrics.neesBounds[1],
                        nis95: metrics.nisBounds[1]
                    }
                },
                observability: {
                    singularValues: obsResult.singularValues
                }
            });
            toast.success("Validation Report Generated");
        } catch (e) {
            toast.error("Generation Failed");
            console.error(e);
        } finally {
            setIsExporting(false);
        }
    };

    return (
        <AppContainer className="min-h-screen pt-12 pb-24">
            <div className="bg-black/30 backdrop-blur-xl border border-white/5 rounded-3xl overflow-hidden shadow-2xl flex flex-col h-[800px]">
                {/* TOOLBAR */}
                <div className="h-20 border-b border-white/5 bg-black/40 flex items-center px-10 justify-between shrink-0">
                    <div className="flex items-center gap-8">
                        <h1 className="text-[10px] font-mono tracking-[0.4em] text-accent/60 uppercase font-bold">Estimation Lab</h1>
                        <div className="h-6 w-px bg-white/5" />
                        <div className="flex items-center gap-4">
                            <button onClick={() => setPaused(!paused)} title={paused ? "Play" : "Pause"} className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all">
                                {paused ? <Play className="w-4 h-4 text-accent fill-current" /> : <Pause className="w-4 h-4 text-white fill-current" />}
                            </button>
                            <button onClick={() => step(0.05)} title="Step Forward" className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all">
                                <ChevronRight className="w-4 h-4 text-white/60" />
                            </button>
                            <button onClick={() => setSimTime(0)} title="Reset" className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all">
                                <RotateCcw className="w-4 h-4 text-white/20" />
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center gap-12">
                        <div className="text-right">
                            <span className="block text-[8px] font-mono text-white/10 uppercase tracking-[0.4em] mb-1">Sim Time</span>
                            <span className="text-xl font-mono text-white/90 tracking-tighter">{simTime.toFixed(2)}s</span>
                        </div>
                    </div>
                </div>

                {/* WORKSPACE */}
                <div className="flex-1 flex overflow-hidden">
                    {/* LEFT PANEL */}
                    <div className="w-[380px] border-r border-white/5 bg-black/20 p-8 overflow-y-auto flex flex-col">
                        <div className="space-y-12 flex-1">
                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <Activity className="w-4 h-4 text-sky-400" />
                                    <h3 className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase">Consistency (NEES)</h3>
                                </div>
                                <div className="h-32 bg-black/40 rounded-2xl border border-white/5 overflow-hidden p-4">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart data={history}>
                                            <CartesianGrid stroke="#ffffff05" vertical={false} />
                                            <YAxis hide domain={[0, 25]} />
                                            <Line type="monotone" dataKey="nees" stroke="#38bdf8" strokeWidth={1} dot={false} isAnimationActive={false} />
                                            <Line type="monotone" dataKey="nees_upper" stroke="#f43f5e" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                                <div className="flex justify-between mt-4">
                                    <span className="text-[10px] font-mono text-white/20 uppercase tracking-widest italic">NEES: {metrics?.nees.toFixed(1) || "-"}</span>
                                    <span className={`text-[10px] font-mono uppercase tracking-widest ${metrics?.isConsistent ? 'text-accent/40' : 'text-red-400/40'}`}>
                                        {metrics?.isConsistent ? 'CONSISTENT' : 'DIVERGING'}
                                    </span>
                                </div>
                            </div>

                            <div>
                                <div className="flex items-center gap-3 mb-6">
                                    <ShieldCheck className="w-4 h-4 text-accent/60" />
                                    <h3 className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase">System Rank</h3>
                                </div>
                                <div className="space-y-6">
                                    <div className="flex items-end gap-3">
                                        <span className="text-5xl font-mono text-white/90 font-light">{obsResult?.rank ?? "-"}</span>
                                        <span className="text-xs text-white/20 mb-2 italic">/ 9 Observable States</span>
                                    </div>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-accent/40" style={{ width: `${((obsResult?.rank || 0) / 9) * 100}%` }} />
                                    </div>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-white/5">
                                <FaultControlPanel />
                            </div>
                        </div>

                        {/* EXPORT ACTION */}
                        <div className="mt-8 pt-6 border-t border-white/5">
                            <button
                                onClick={handleExport}
                                disabled={isExporting}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-white/90 hover:bg-white text-black rounded-xl text-[10px] font-mono tracking-[0.3em] uppercase font-bold transition-all disabled:opacity-50"
                            >
                                {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileText className="w-4 h-4" />}
                                {isExporting ? "Generating..." : "Generate Analysis Report"}
                            </button>
                        </div>
                    </div>

                    {/* CENTER (SCENE CONTEXT) */}
                    <div className="flex-1 bg-black/10 relative">
                        <div className="absolute top-10 left-10 p-6 bg-black/40 backdrop-blur-xl border border-white/5 rounded-2xl">
                            <div className="text-[10px] font-mono uppercase text-white/10 tracking-[0.3em] mb-2">Sensor Hub</div>
                            <div className="text-xs text-white/60 font-mono tracking-widest italic uppercase">ADCS Real-time Telemetry</div>
                        </div>

                        <div className="absolute bottom-10 right-10 flex gap-4">
                            <div className="p-4 bg-black/40 backdrop-blur-md border border-white/5 rounded-xl">
                                <div className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1">State Vector</div>
                                <div className="text-[11px] font-mono text-white/70">19 Dimensions</div>
                            </div>
                            <div className="p-4 bg-black/40 backdrop-blur-md border border-white/5 rounded-xl">
                                <div className="text-[8px] font-mono text-white/20 uppercase tracking-[0.2em] mb-1">Update Rate</div>
                                <div className="text-[11px] font-mono text-white/70">20.0 Hz</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </AppContainer>
    );
}
