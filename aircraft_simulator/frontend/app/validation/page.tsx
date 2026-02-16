"use client";

import { useEffect, useState } from 'react';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { validationEngine, ValidationSnapshot } from '@/lib/validation/ValidationEngine';
import { ValidationReportGenerator } from '@/lib/validation/ValidationReportGenerator';
import { simulationEngine } from '@/lib/simulation/simulation-engine';
import { Canvas } from '@react-three/fiber';
import { OrbitControls, useGLTF } from '@react-three/drei';
import CovarianceEllipsoid from '@/components/validation/CovarianceEllipsoid';
import { toast } from 'sonner';
import { Download, Play, Loader2 } from 'lucide-react';
import { AppContainer } from '@/components/ui/AppContainer';

export default function ValidationPage() {
    const setScene = useSimulationStore((state) => state.setScene);
    const [snapshot, setSnapshot] = useState<ValidationSnapshot | null>(null);
    const [attackAlpha, setAttackAlpha] = useState(0);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    useEffect(() => {
        setScene('void');
        const load = async () => {
            const snap = await validationEngine.runSnapshot(simulationEngine);
            setSnapshot(snap);
        };
        load();
    }, [setScene]);

    const handleRunAnalysis = async () => {
        if (isAnalyzing) return;
        setIsAnalyzing(true);
        toast.info(attackAlpha > 0 ? `Starting Adversarial Batch (Attack: ${attackAlpha})...` : "Starting Nominal Batch...",
            { description: "Running 10 trials x 2.0s horizon" });

        await new Promise(r => setTimeout(r, 100));

        try {
            const result = await validationEngine.runMonteCarlo(simulationEngine, 10, attackAlpha);
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

    if (!snapshot) return <div className="p-12 text-center font-mono text-white/50">Initializing Validation Engine...</div>;

    const { trimId, F, consistency, observability, covariance } = snapshot;

    return (
        <AppContainer className="pb-24">
            {/* SECTION 0: OPERATING POINT */}
            <header className="sticky top-0 z-40 bg-black/40 backdrop-blur-md border border-white/5 rounded-2xl px-8 py-6 flex items-center justify-between mb-12 mt-6">
                <div>
                    <h1 className="text-[10px] font-mono tracking-[0.3em] text-accent/60 uppercase">Validation Console</h1>
                    <div className="flex items-center gap-4 mt-2">
                        <span className="text-xl font-medium tracking-tight text-white/90">{trimId}</span>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleRunAnalysis}
                        disabled={isAnalyzing}
                        className={`flex items-center gap-3 px-6 py-2 rounded-xl text-[11px] font-mono tracking-widest uppercase transition-all border
                            ${isAnalyzing
                                ? 'bg-white/5 text-white/20 border-white/5 cursor-not-allowed'
                                : 'bg-accent/10 text-accent border-accent/20 hover:bg-accent hover:text-black'
                            }`}
                    >
                        {isAnalyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 fill-current" />}
                        {isAnalyzing ? 'Running...' : 'Run Analysis'}
                    </button>

                    <button
                        onClick={handleExport}
                        className="flex items-center gap-3 px-6 py-2 bg-white/90 text-black rounded-xl text-[11px] font-mono tracking-widest uppercase hover:bg-white transition-colors"
                    >
                        <Download className="w-4 h-4" />
                        Export
                    </button>
                </div>
            </header>

            <main className="space-y-12">
                {/* 1. Linearization */}
                <section className="grid grid-cols-2 gap-8">
                    <div className="bg-black/30 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl">
                        <h2 className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase mb-8">System Model</h2>
                        <div className="space-y-4 font-mono text-[11px] text-white/30 italic">
                            <p>δẋ = F δx + G δu + w</p>
                            <p>δz = H δx + v</p>
                        </div>
                    </div>

                    <div className="bg-black/30 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl">
                        <h2 className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase mb-8">Jacobian (F) Sparsity</h2>
                        <div className="grid grid-cols-[repeat(19,minmax(0,1fr))] gap-1 aspect-square max-w-[200px]">
                            {F.flat().map((val, i) => {
                                const mag = Math.abs(val);
                                let bg = 'bg-white/[0.02]';
                                if (mag > 0.001) bg = 'bg-white/10';
                                if (mag > 1) bg = 'bg-accent/40';
                                return <div key={i} className={`w-full h-full ${bg} rounded-[1px]`} />
                            })}
                        </div>
                    </div>
                </section>

                {/* 2. Consistency */}
                <section className="grid grid-cols-2 gap-8">
                    <div className={`p-8 rounded-2xl border backdrop-blur-xl ${consistency.nees < consistency.bounds.nees95 ? 'bg-black/30 border-white/5' : 'bg-red-500/5 border-red-500/20'}`}>
                        <h2 className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase mb-8">NEES Consistency</h2>
                        <div className="flex items-baseline gap-4">
                            <span className={`text-4xl font-mono ${consistency.nees < consistency.bounds.nees95 ? 'text-white/90' : 'text-red-400'}`}>
                                {consistency.nees.toFixed(2)}
                            </span>
                            <span className="text-xs text-white/20 font-mono italic">
                                / {consistency.bounds.nees95.toFixed(1)} Upper Bound
                            </span>
                        </div>
                    </div>

                    <div className="bg-black/30 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl">
                        <h2 className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase mb-8">Adversarial Gain</h2>
                        <input
                            type="range"
                            min="0" max="10" step="0.1"
                            value={attackAlpha}
                            onChange={(e) => setAttackAlpha(Number(e.target.value))}
                            className="w-full accent-accent h-[2px] bg-white/5 rounded-lg appearance-none cursor-pointer"
                        />
                        <div className="flex justify-between mt-4 text-[9px] font-mono text-white/20 uppercase tracking-widest">
                            <span>Nominal</span>
                            <span className="text-accent/40">Injected: {attackAlpha.toFixed(1)}</span>
                            <span>Max Alpha</span>
                        </div>
                    </div>
                </section>

                {/* 3. Observability Spectrum */}
                <section className="bg-black/30 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl">
                    <h2 className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase mb-8">Observability Spectrum</h2>
                    <div className="space-y-4">
                        {observability.singularValues.slice(0, 6).map((sigma, i) => (
                            <div key={i} className="flex items-center gap-6">
                                <div className="w-4 font-mono text-[10px] text-white/10 uppercase tracking-widest">{i + 1}</div>
                                <div className="flex-1 h-[2px] bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-accent/30 rounded-full"
                                        style={{ width: `${Math.log10(sigma + 1e-15) / Math.log10(Math.max(...observability.singularValues)) * 100}%` }}
                                    />
                                </div>
                                <div className="w-24 font-mono text-[10px] text-right text-white/40 uppercase tracking-tighter italic">
                                    {sigma.toExponential(2)}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* 4. 3D View */}
                <section className="bg-black/30 backdrop-blur-xl border border-white/5 rounded-3xl h-[600px] relative overflow-hidden shadow-2xl">
                    <Canvas camera={{ position: [5, 5, 10], fov: 35 }}>
                        <ambientLight intensity={0.5} />
                        <pointLight position={[10, 10, 10]} intensity={1} />
                        <OrbitControls makeDefault />
                        <gridHelper args={[20, 20, 0x111111, 0x050505]} />
                        <AircraftModel />
                        <group position={[0, 0, 0]}>
                            <CovarianceEllipsoid
                                eigenVectors={covariance.eigenVectors}
                                eigenValues={covariance.eigenValues}
                                weakestDirection={observability.weakestDirection}
                                nees={consistency.nees}
                                neesBound={consistency.bounds.nees95}
                            />
                        </group>
                    </Canvas>
                    <div className="absolute top-8 right-8 p-6 bg-black/60 backdrop-blur-xl border border-white/5 rounded-2xl">
                        <div className="text-[10px] font-mono uppercase text-white/20 tracking-[0.3em] mb-2">Scene Context</div>
                        <div className="text-xs text-white/60 font-mono tracking-widest italic uppercase">Covariance Geometry (1-Sigma)</div>
                    </div>
                </section>
            </main>
        </AppContainer>
    );
}

function AircraftModel() {
    const { scene } = useGLTF("/models/fighterplane/scene.gltf");
    return <primitive object={scene} scale={0.8} rotation={[0, Math.PI, 0]} />;
}
