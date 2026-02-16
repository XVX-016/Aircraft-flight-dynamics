"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { simulationEngine } from "@/lib/simulation/simulation-engine";
import { LineChart, Line, YAxis, CartesianGrid, ResponsiveContainer } from 'recharts';
import { useSimulationStore } from "@/stores/useSimulationStore";
import FaultControlPanel from "@/components/estimation/FaultControlPanel";
import { Play, Pause, RotateCcw, Activity, ShieldCheck, ChevronRight, FileText, Loader2 } from "lucide-react";
import { Matrix, inverse } from "ml-matrix";
import { AppContainer } from "@/components/ui/AppContainer";
import { toast } from "sonner";
import { ValidationSnapshot, validationEngine } from "@/lib/validation/ValidationEngine";
import { Quat } from "@/lib/simulation/utils";

type Metrics = { nees: number; nis: number; neesUpper: number; isConsistent: boolean };
type HistoryPoint = { time: string; nees: number; nis: number; nees_upper: number };

const NEES_UPPER = 19.02;
const NIS_UPPER = 7.81;

function computeMetricsFromEstimate(
    estState: number[],
    truthPos: [number, number, number],
    covariance: number[][]
): Metrics {
    const posEst: [number, number, number] = [
        estState[9] ?? truthPos[0],
        estState[10] ?? truthPos[1],
        estState[11] ?? truthPos[2]
    ];
    const err = [
        posEst[0] - truthPos[0],
        posEst[1] - truthPos[1],
        posEst[2] - truthPos[2]
    ];
    const P = new Matrix([
        [covariance[9]?.[9] ?? 1, covariance[9]?.[10] ?? 0, covariance[9]?.[11] ?? 0],
        [covariance[10]?.[9] ?? 0, covariance[10]?.[10] ?? 1, covariance[10]?.[11] ?? 0],
        [covariance[11]?.[9] ?? 0, covariance[11]?.[10] ?? 0, covariance[11]?.[11] ?? 1]
    ]);
    const R = Matrix.eye(3).mul(25);
    const S = P.add(R);

    const e = new Matrix([[err[0]], [err[1]], [err[2]]]);
    const PInv = inverse(P);
    const SInv = inverse(S);
    const nees = e.transpose().mmul(PInv).mmul(e).get(0, 0);
    const nis = e.transpose().mmul(SInv).mmul(e).get(0, 0);

    return {
        nees,
        nis,
        neesUpper: NEES_UPPER,
        isConsistent: nees <= NEES_UPPER && nis <= NIS_UPPER
    };
}

export default function EstimationValidationLab() {
    const [simTime, setSimTime] = useState(0);
    const [paused, setPaused] = useState(true);
    const [mounted, setMounted] = useState(false);
    const [metrics, setMetrics] = useState<Metrics | null>(null);
    const [snapshot, setSnapshot] = useState<ValidationSnapshot | null>(null);
    const [history, setHistory] = useState<HistoryPoint[]>([]);
    const [isExporting, setIsExporting] = useState(false);

    const setScene = useSimulationStore((state) => state.setScene);
    const setEstimationData = useSimulationStore((state) => state.setEstimationData);

    // Storage for report snapshots
    const snapshotBusyRef = useRef(false);

    const simTimeRef = useRef(0);

    const step = useCallback((dt: number) => {
        simulationEngine.update(dt);
        const truth = simulationEngine.getRenderState(0);
        const core = simulationEngine.getCoreState();
        const estimate = core.estimate;
        if (!estimate?.state || !estimate?.covariance) return;

        const metricSnapshot = computeMetricsFromEstimate(
            estimate.state,
            [truth.p.x, truth.p.y, truth.p.z],
            estimate.covariance
        );
        setMetrics(metricSnapshot);

        // Update Ref and State
        simTimeRef.current += dt;
        setSimTime(simTimeRef.current);

        setEstimationData({
            estimatedState: {
                position: {
                    x: estimate.state[9] ?? truth.p.x,
                    y: estimate.state[10] ?? truth.p.y,
                    z: estimate.state[11] ?? truth.p.z
                },
                rotation: Quat.fromEuler(
                    estimate.state[6] ?? 0,
                    estimate.state[7] ?? 0,
                    estimate.state[8] ?? 0
                )
            },
            covariance: estimate.covariance
        });

        setHistory(prev => {
            const nw: HistoryPoint[] = [...prev, {
                time: (simTimeRef.current).toFixed(1),
                nees: metricSnapshot.nees,
                nis: metricSnapshot.nis,
                nees_upper: metricSnapshot.neesUpper,
            }];
            if (nw.length > 50) nw.shift();
            return nw;
        });

        if (!snapshotBusyRef.current && Math.floor(simTimeRef.current * 10) % 5 === 0) {
            snapshotBusyRef.current = true;
            validationEngine.runSnapshot(simulationEngine)
                .then((snap) => setSnapshot(snap))
                .finally(() => {
                    snapshotBusyRef.current = false;
                });
        }

    }, [setEstimationData]);

    useEffect(() => {
        setScene('estimation');
        validationEngine.runSnapshot(simulationEngine).then((snap) => setSnapshot(snap));
    }, [setScene]);

    useEffect(() => {
        setMounted(true);
    }, []);

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
        if (!snapshot) {
            toast.error("No telemetry data available for report");
            return;
        }

        setIsExporting(true);
        try {
            const mod = await import('@/lib/validation/ValidationReportGenerator');
            mod.ValidationReportGenerator.generateReport(snapshot);
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
                            <button onClick={() => { setSimTime(0); simTimeRef.current = 0; }} title="Reset" className="p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 transition-all">
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
                                    {mounted ? (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart data={history}>
                                                <CartesianGrid stroke="#ffffff05" vertical={false} />
                                                <YAxis hide domain={[0, 25]} />
                                                <Line type="monotone" dataKey="nees" stroke="#38bdf8" strokeWidth={1} dot={false} isAnimationActive={false} />
                                                <Line type="monotone" dataKey="nees_upper" stroke="#f43f5e" strokeWidth={1} strokeDasharray="3 3" dot={false} isAnimationActive={false} />
                                            </LineChart>
                                        </ResponsiveContainer>
                                    ) : null}
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
                                        <span className="text-5xl font-mono text-white/90 font-light">{snapshot?.observability.rank ?? "-"}</span>
                                        <span className="text-xs text-white/20 mb-2 italic">/ 9 Observable States</span>
                                    </div>
                                    <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                                        <div className="h-full bg-accent/40" style={{ width: `${((snapshot?.observability.rank || 0) / 9) * 100}%` }} />
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
