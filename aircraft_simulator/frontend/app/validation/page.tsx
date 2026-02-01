"use client";

import { useEffect, useState, useRef } from 'react';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { validationEngine, ValidationSnapshot } from '@/lib/validation/ValidationEngine';
import { ValidationReportGenerator } from '@/lib/validation/ValidationReportGenerator';
import { simulationEngine } from '@/lib/simulation/simulation-engine';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF, Environment } from '@react-three/drei';
import CovarianceEllipsoid from '@/components/validation/CovarianceEllipsoid';
import { toast } from 'sonner';
import { Download, AlertTriangle, CheckCircle, XCircle, Play, Loader2 } from 'lucide-react';

export default function ValidationPage() {
    const setScene = useSimulationStore((state) => state.setScene);
    const [snapshot, setSnapshot] = useState<ValidationSnapshot | null>(null);
    const [attackAlpha, setAttackAlpha] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    // Initial Data Fetch
    useEffect(() => {
        setScene('void'); // Disable global background scene

        // Emulate batch run / snapshot capture
        const snap = validationEngine.runSnapshot(simulationEngine);
        setSnapshot(snap);
    }, [setScene]);

    const handleRunAnalysis = async () => {
        if (isAnalyzing) return;
        setIsAnalyzing(true);
        toast.info(attackAlpha > 0 ? `Starting Adversarial Batch (Attack: ${attackAlpha})...` : "Starting Nominal Batch...",
            { description: "Running 10 trials x 2.0s horizon" });

        // Yield to UI render
        await new Promise(r => setTimeout(r, 100));

        try {
            const result = validationEngine.runMonteCarlo(simulationEngine, 10, attackAlpha);
            setSnapshot(result);

            const verdict = result.consistency.nees < result.consistency.bounds.nees95 ? "PASS" : "FAIL";
            if (verdict === "PASS") toast.success("Validation PASSED", { description: `NEES ${result.consistency.nees.toFixed(2)} within bounds.` });
            else toast.error("Validation FAILED", { description: `NEES ${result.consistency.nees.toFixed(2)} exceeded covariance.` });

        } catch (e) {
            toast.error("Analysis Failed");
            console.error(e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleExport = () => {
        if (!snapshot) return;
        try {
            ValidationReportGenerator.generateReport(snapshot);
            toast.success("Report Generated");
        } catch (e) {
            toast.error("Export Failed");
            console.error(e);
        }
    };

    if (!snapshot) return <div className="p-12 text-center text-mono text-white/50">Initializing Validation Engine...</div>;

    const { trimId, F, H, observability, consistency } = snapshot;

    return (
        <div className="min-h-screen bg-slate-950 text-slate-200 font-sans selection:bg-emerald-500/30 pb-24">
            {/* SECTION 0: OPERATING POINT (Sticky) */}
            <header className="sticky top-0 z-50 bg-slate-950/90 backdrop-blur border-b border-slate-800 px-8 py-4 flex items-center justify-between">
                <div>
                    <h1 className="text-sm font-mono tracking-[0.2em] text-emerald-500 uppercase">Validation Console</h1>
                    <div className="flex items-center gap-4 mt-1">
                        <span className="text-xl font-bold tracking-tight text-white">{trimId}</span>
                        <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-900 px-2 py-1 rounded">
                            <span>x₀: LOCKED</span>
                            <span className="text-slate-700">|</span>
                            <span>u₀: LOCKED</span>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing}
                        className={`flex items-center gap-2 px-4 py-2 rounded font-bold transition-all border
                            ${isAnalyzing
                                ? 'bg-slate-800 text-slate-500 border-slate-700 cursor-not-allowed'
                                : 'bg-emerald-500/10 text-emerald-500 border-emerald-500/50 hover:bg-emerald-500 hover:text-white'
                            }`}
                    >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        {isAnalyzing ? 'Running Batch...' : 'Run Monte Carlo'}
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-900 rounded font-bold hover:bg-white transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export Report
                    </button>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-8 py-12 space-y-16">

                {/* SECTION 1: LINEARIZATION SNAPSHOT */}
                <section>
                    <h2 className="text-lg font-bold border-l-2 border-emerald-500 pl-3 mb-6">1. Linearization Snapshot</h2>
                    <div className="grid grid-cols-2 gap-8">
                        {/* Symbolic */}
                        <div className="bg-slate-900/50 p-6 rounded border border-slate-800 font-mono text-sm leading-relaxed text-slate-400">
                            <p>ẋ = f(x,u)</p>
                            <p>z = h(x)</p>
                            <div className="my-4 h-px bg-slate-800" />
                            <p className="text-emerald-400">δẋ = F δx + G δu + w</p>
                            <p className="text-emerald-400">δz = H δx + v</p>
                        </div>

                        {/* Matrix Visualization */}
                        <div className="bg-slate-900 p-6 rounded border border-slate-800">
                            <h3 className="text-xs font-mono text-slate-500 uppercase mb-4">Dynamics Jacobian (F) Structure</h3>
                            {/* Simple Grid Vis of 19x19 F Matrix */}
                            <div className="grid grid-cols-[repeat(19,minmax(0,1fr))] gap-0.5 aspect-square max-w-sm">
                                {F.flat().map((val, i) => {
                                    const mag = Math.abs(val);
                                    let bg = 'bg-slate-800';
                                    if (mag > 0.001) bg = 'bg-slate-400';
                                    if (mag > 1) bg = 'bg-emerald-400';
                                    return <div key={i} className={`w-full h-full ${bg} rounded-[1px]`} title={val.toFixed(4)} />
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 2: OBSERVABILITY SPECTRUM */}
                <section>
                    <h2 className="text-lg font-bold border-l-2 border-emerald-500 pl-3 mb-6">2. Observability Spectrum</h2>
                    <div className="bg-slate-900 rounded border border-slate-800 p-8">
                        <div className="space-y-4">
                            {observability.singularValues.slice(0, 8).map((sigma, i) => ( // Show top 8
                                <div key={i} className="flex items-center gap-4">
                                    <div className="w-8 text-right font-mono text-xs text-slate-500">{i + 1}</div>
                                    <div className="flex-1 h-2 bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-emerald-500 rounded-full"
                                            style={{ width: `${Math.log10(sigma + 1e-15) / Math.log10(Math.max(...observability.singularValues)) * 100}%` }}
                                        />
                                    </div>
                                    <div className="w-24 font-mono text-xs text-right text-slate-300">
                                        {sigma.toExponential(2)}
                                    </div>
                                    <div className="w-24 text-xs font-bold text-right text-emerald-400">
                                        {sigma > 1e-5 ? 'OBSERVABLE' : 'WEAK'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </section>

                {/* SECTION 3: WEAKEST DIRECTION */}
                <section>
                    <h2 className="text-lg font-bold border-l-2 border-emerald-500 pl-3 mb-6">3. Weakest Direction (v_min)</h2>
                    <div className="bg-slate-900 rounded border border-slate-800 p-6 font-mono text-sm">
                        <div className="flex gap-8">
                            <div>
                                <h3 className="text-xs text-slate-500 uppercase mb-2">Dominant States</h3>
                                {observability.weakestDirection.map((w, i) => {
                                    // Assume index mapping for demo
                                    if (Math.abs(w) < 0.1) return null;
                                    const LABELS = ['px', 'py', 'pz', 'vx', 'vy', 'vz', 'q1', 'q2', 'q3', 'q4', 'wx', 'wy', 'wz', 'bgx', 'bgy', 'bgz', 'bax', 'bay', 'baz'];
                                    return (
                                        <div key={i} className="flex justify-between w-48 mb-1">
                                            <span className="text-slate-400">{LABELS[i] || `x${i}`}</span>
                                            <span className="text-emerald-400">{w.toFixed(4)}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 4: ADVERSARIAL INJECTION */}
                <section>
                    <h2 className="text-lg font-bold border-l-2 border-emerald-500 pl-3 mb-6">4. Adversarial Noise Injection</h2>
                    <div className="bg-slate-900 rounded border border-slate-800 p-6">
                        <label className="block text-xs font-mono text-slate-500 uppercase mb-4">Attack Gain (α)</label>
                        <input
                            type="range"
                            min="0" max="10" step="0.1"
                            value={attackAlpha}
                            onChange={(e) => setAttackAlpha(Number(e.target.value))}
                            className="w-full accent-rose-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between mt-2 text-xs font-mono">
                            <span>0.0 (Nominal)</span>
                            <span className="text-rose-400">5.0 (Critical)</span>
                            <span>10.0</span>
                        </div>
                    </div>
                </section>

                {/* SECTION 5: CONSISTENCY VERDICT */}
                <section>
                    <h2 className="text-lg font-bold border-l-2 border-emerald-500 pl-3 mb-6">5. Estimator Consistency</h2>
                    <div className="grid grid-cols-2 gap-4">
                        <div className={`p-4 rounded border ${consistency.nees < consistency.bounds.nees95 ? 'bg-emerald-500/10 border-emerald-500/30' : 'bg-rose-500/10 border-rose-500/30'}`}>
                            <h3 className="text-xs font-mono uppercase opacity-50 mb-2">NEES (State)</h3>
                            <div className="flex items-baseline gap-3">
                                <span className={`text-3xl font-bold font-mono ${consistency.nees < consistency.bounds.nees95 ? 'text-emerald-400' : 'text-rose-400 drop-shadow-[0_0_10px_rgba(251,113,133,0.5)]'}`}>
                                    {consistency.nees.toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">
                                    / {consistency.bounds.nees95.toFixed(1)} (χ² 95%)
                                </span>
                            </div>
                        </div>

                        <div className="p-4 rounded border bg-slate-900 border-slate-800">
                            <h3 className="text-xs font-mono uppercase opacity-50 mb-2">NIS (Measurement)</h3>
                            <div className="flex items-baseline gap-3">
                                <span className="text-3xl font-bold font-mono text-white">
                                    {consistency.nis.toFixed(2)}
                                </span>
                                <span className="text-xs text-slate-500 font-mono">
                                    / {consistency.bounds.nis95.toFixed(1)}
                                </span>
                            </div>
                        </div>
                    </div>
                </section>

                {/* SECTION 6: 3D COVARIANCE VIEW */}
                <section>
                    <h2 className="text-lg font-bold border-l-2 border-emerald-500 pl-3 mb-6">6. Covariance Geometry & Alignment</h2>
                    <div className="bg-black rounded-xl border border-slate-800 h-[500px] relative overflow-hidden">
                        <Canvas camera={{ position: [2, 2, 5], fov: 45 }}>
                            <ambientLight intensity={0.5} />
                            <pointLight position={[10, 10, 10]} intensity={1} />
                            <OrbitControls makeDefault />

                            <gridHelper args={[20, 20, 0x333333, 0x111111]} />

                            {/* The Aircraft Model (Scaled small as reference) */}
                            <AircraftModel />

                            {/* The GLSL Ellipsoid */}
                            <group position={[0, 0, 0]}> {/* Centered on aircraft for now */}
                                <CovarianceEllipsoid
                                    eigenVectors={[[1, 0, 0], [0, 1, 0], [0, 0, 1]]} // Placeholder until engine computes matrix
                                    eigenValues={[2, 1, 0.5]} // Placeholder
                                    weakestDirection={[0, 0, 1]}
                                    nees={consistency.nees}
                                    neesBound={consistency.bounds.nees95}
                                />
                            </group>
                        </Canvas>

                        <div className="absolute bottom-4 left-4 p-4 bg-black/80 backdrop-blur border border-white/10 rounded pointer-events-none">
                            <div className="text-[10px] font-mono uppercase text-slate-500 mb-1">Visualization Mode</div>
                            <div className="text-xs text-white">Covariance 1σ Surface</div>
                        </div>
                    </div>
                </section>

            </main>
        </div>
    );
}

function AircraftModel() {
    const { scene } = useGLTF("/models/fighterplane/scene.gltf");
    return <primitive object={scene} scale={0.5} />;
}
