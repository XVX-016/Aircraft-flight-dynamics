"use client";

import { useEffect, useState } from "react";
import WindFlow from "@/components/pilot/WindFlow";
import { useSimulationStore } from "@/stores/useSimulationStore";
import { simulationEngine } from "@/lib/simulation/simulation-engine";
import { LQR } from "@/core/control/lqr";
import * as math from "mathjs";
import { EigenvalueDecomposition, Matrix } from "ml-matrix";

type BodePoint = { freq: number; mag: number; phase: number };
type StepPoint = { x: number; y: number };
type ModePoint = { mode: string; eigenvalue: string; damping: string; stable: boolean };

function matVecMul(M: number[][], x: number[]): number[] {
    return M.map((row) => row.reduce((acc, v, j) => acc + v * x[j], 0));
}

function vecAdd(a: number[], b: number[]): number[] {
    return a.map((v, i) => v + b[i]);
}

function vecScale(a: number[], s: number): number[] {
    return a.map((v) => v * s);
}

function synthesizeControlResponse(A: number[][], B: number[][], K: number[][]): StepPoint[] {
    const n = A.length;
    const dt = 0.02;
    const steps = 500;
    const data: StepPoint[] = [];

    // 10 m equivalent perturbation in altitude-like channel (state z at index 11)
    let x = new Array(n).fill(0);
    x[11] = 10;

    // Acl = A - B K
    const BK = math.multiply(math.matrix(B), math.matrix(K)).toArray() as number[][];
    const Acl = A.map((row, i) => row.map((v, j) => v - BK[i][j]));

    for (let i = 0; i <= steps; i++) {
        const t = i * dt;
        const zErr = x[11];
        data.push({ x: t, y: 50 + zErr });
        const xdot = matVecMul(Acl, x);
        x = vecAdd(x, vecScale(xdot, dt));
    }
    return data;
}

function bodeFromStateSpace(A: number[][], B: number[][]): BodePoint[] {
    // SISO: output theta (state 7), input elevator (input 2)
    const n = A.length;
    const C = new Array(n).fill(0);
    C[7] = 1;
    const bCol = B.map((r) => r[2] ?? 0);

    const data: BodePoint[] = [];
    let f = 0.1;
    while (f <= 100) {
        const w = 2 * Math.PI * f;
        const negA = A.map((row) => row.map((v) => -v));
        const I = A.map((row, i) => row.map((_, j) => (i === j ? 1 : 0)));
        const n2 = 2 * n;
        const M: number[][] = Array.from({ length: n2 }, () => Array(n2).fill(0));
        const rhs: number[] = Array(n2).fill(0);

        try {
            for (let i = 0; i < n; i++) {
                for (let j = 0; j < n; j++) {
                    M[i][j] = negA[i][j];
                    M[i][j + n] = -w * I[i][j];
                    M[i + n][j] = w * I[i][j];
                    M[i + n][j + n] = negA[i][j];
                }
                rhs[i] = bCol[i];
            }

            const sol = math.lusolve(M, rhs.map((v) => [v])) as number[][];
            const xr = sol.slice(0, n).map((r) => r[0]);
            const xi = sol.slice(n, n2).map((r) => r[0]);
            const yr = C.reduce((acc, c, i) => acc + c * xr[i], 0);
            const yi = C.reduce((acc, c, i) => acc + c * xi[i], 0);
            const mag = 20 * Math.log10(Math.max(1e-12, Math.hypot(yr, yi)));
            const phase = Math.atan2(yi, yr) * 180 / Math.PI;
            data.push({ freq: f, mag, phase });
        } catch {
            data.push({ freq: f, mag: -120, phase: -180 });
        }

        f *= 1.25;
    }
    return data;
}

function computeMetrics(bode: BodePoint[], step: StepPoint[]) {
    // Simple numerics for display; still derived from model outputs.
    let bandwidth = NaN;
    const dc = bode[0]?.mag ?? 0;
    const bwPt = bode.find((p) => p.mag <= dc - 3);
    if (bwPt) bandwidth = bwPt.freq;

    let pm = NaN;
    const gainCross = bode.find((p) => p.mag <= 0);
    if (gainCross) pm = 180 + gainCross.phase;

    let gm = NaN;
    const phaseCross = bode.find((p) => p.phase <= -180);
    if (phaseCross) gm = -phaseCross.mag;

    const y0 = step[0]?.y ?? 0;
    const yf = step[step.length - 1]?.y ?? y0;
    const target = yf;
    const peak = Math.max(...step.map((p) => p.y));
    const overshootPct = Math.max(0, ((peak - target) / Math.max(1e-6, Math.abs(target - y0))) * 100);
    let settling = NaN;
    const band = 0.02 * Math.max(1e-6, Math.abs(target - y0));
    for (let i = 0; i < step.length; i++) {
        if (step.slice(i).every((p) => Math.abs(p.y - target) <= band)) {
            settling = step[i].x;
            break;
        }
    }

    return {
        gainMarginDb: gm,
        phaseMarginDeg: pm,
        bandwidthHz: bandwidth,
        settlingTimeS: settling,
        overshootPct
    };
}

function classifyModes(A: number[][]): ModePoint[] {
    const evd = new EigenvalueDecomposition(new Matrix(A));
    const real = evd.realEigenvalues;
    const imag = evd.imaginaryEigenvalues;
    const used = new Array(real.length).fill(false);
    const modes: ModePoint[] = [];

    const near = (a: number, b: number, tol = 1e-3) => Math.abs(a - b) < tol;

    for (let i = 0; i < real.length; i++) {
        if (used[i]) continue;
        const re = real[i];
        const im = imag[i];

        if (Math.abs(im) > 1e-6) {
            let jMatch = -1;
            for (let j = i + 1; j < real.length; j++) {
                if (!used[j] && near(real[j], re) && near(imag[j], -im)) {
                    jMatch = j;
                    break;
                }
            }
            used[i] = true;
            if (jMatch >= 0) used[jMatch] = true;

            const wn = Math.hypot(re, im);
            const zeta = wn > 1e-8 ? -re / wn : 0;
            const label = wn > 1.2 ? "Short-Period / Dutch-Roll" : "Phugoid / Dutch-Roll";
            modes.push({
                mode: label,
                eigenvalue: `${re.toFixed(3)} ${im >= 0 ? "+" : "-"} ${Math.abs(im).toFixed(3)}i`,
                damping: zeta.toFixed(3),
                stable: re < 0
            });
        } else {
            used[i] = true;
            const absRe = Math.abs(re);
            let label = "Real Mode";
            if (re > 0) label = "Unstable Real Mode";
            else if (absRe < 0.05) label = "Spiral-like";
            else if (absRe > 1.0) label = "Roll-like";
            modes.push({
                mode: label,
                eigenvalue: re.toFixed(3),
                damping: "N/A",
                stable: re < 0
            });
        }
    }

    return modes.sort((a, b) => {
        const aMag = Math.abs(parseFloat(a.eigenvalue));
        const bMag = Math.abs(parseFloat(b.eigenvalue));
        return bMag - aMag;
    }).slice(0, 8);
}

const ControlAnalysisPage = () => {
    const [gains, setGains] = useState({
        q1: 40,
        q2: 30,
        q3: 25,
        q4: 20,
        r1: 30,
        r2: 25
    });
    const [stabilityData, setStabilityData] = useState<StepPoint[]>([]);
    const [bodeData, setBodeData] = useState<BodePoint[]>([]);
    const [kEntries, setKEntries] = useState<number[]>([]);
    const [modes, setModes] = useState<ModePoint[]>([]);
    const [status, setStatus] = useState("COMPUTING");
    const [metrics, setMetrics] = useState({
        gainMarginDb: NaN,
        phaseMarginDeg: NaN,
        bandwidthHz: NaN,
        settlingTimeS: NaN,
        overshootPct: NaN
    });
    const setScene = useSimulationStore((state) => state.setScene);

    useEffect(() => {
        setScene("void");
    }, [setScene]);

    useEffect(() => {
        const run = async () => {
            try {
                const { A, B } = await simulationEngine.computeLinearization();
                const n = A.length;
                const m = B[0]?.length || 4;
                const Q = Array.from({ length: n }, (_, i) =>
                    Array.from({ length: n }, (_, j) => {
                        if (i !== j) return 0;
                        if (i === 7) return 1 + gains.q1 / 10; // theta
                        if (i === 11) return 1 + gains.q2 / 10; // z
                        if (i === 10) return 1 + gains.q3 / 10; // q
                        return 0.2 + gains.q4 / 50;
                    })
                );
                const R = Array.from({ length: m }, (_, i) =>
                    Array.from({ length: m }, (_, j) => (i === j ? (i < 2 ? 1 + gains.r1 / 20 : 1 + gains.r2 / 20) : 0))
                );
                const lqr = new LQR();
                const K = lqr.computeGain(A, B, Q, R);
                setKEntries(K.flat().slice(0, 9));
                setModes(classifyModes(A));

                const step = synthesizeControlResponse(A, B, K);
                const bode = bodeFromStateSpace(A, B);
                setStabilityData(step);
                setBodeData(bode);
                setMetrics(computeMetrics(bode, step));
                setStatus("MODEL-DRIVEN");
            } catch {
                setStatus("ERROR");
            }
        };
        run();
    }, [gains]);

    const sliderConfig = [
        { key: "q1" as const, label: "Q_theta", sublabel: "Pitch Angle Weight" },
        { key: "q2" as const, label: "Q_alt", sublabel: "Altitude Weight" },
        { key: "q3" as const, label: "Q_q", sublabel: "Pitch Rate Weight" },
        { key: "q4" as const, label: "Q_misc", sublabel: "Other State Weights" },
        { key: "r1" as const, label: "R_u12", sublabel: "Throttle/Aileron Penalty" },
        { key: "r2" as const, label: "R_u34", sublabel: "Elevator/Rudder Penalty" }
    ];

    const renderStabilityGraph = () => {
        const width = 600;
        const height = 250;
        if (stabilityData.length === 0) return null;
        const xMax = stabilityData[stabilityData.length - 1].x || 1;
        const yMin = Math.min(...stabilityData.map((d) => d.y));
        const yMax = Math.max(...stabilityData.map((d) => d.y));
        const ySpan = Math.max(1e-6, yMax - yMin);
        const points = stabilityData.map((d) => {
            const x = (d.x / xMax) * width;
            const y = height - ((d.y - yMin) / ySpan) * height;
            return `${x},${y}`;
        }).join(" ");
        return (
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                {[0, 1, 2, 3, 4].map((i) => (
                    <line key={`h-${i}`} x1={0} y1={(i / 4) * height} x2={width} y2={(i / 4) * height} stroke="white" strokeOpacity={0.05} />
                ))}
                <polyline points={points} fill="none" stroke="#00E680" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            </svg>
        );
    };

    const renderBodePlot = () => {
        const width = 600;
        const height = 200;
        if (bodeData.length === 0) return null;
        const xFromF = (f: number) => {
            const fMin = Math.log10(bodeData[0].freq);
            const fMax = Math.log10(bodeData[bodeData.length - 1].freq);
            return ((Math.log10(f) - fMin) / Math.max(1e-6, fMax - fMin)) * width;
        };
        const magMin = Math.min(...bodeData.map((d) => d.mag));
        const magMax = Math.max(...bodeData.map((d) => d.mag));
        const phaseMin = Math.min(...bodeData.map((d) => d.phase));
        const phaseMax = Math.max(...bodeData.map((d) => d.phase));
        const magPts = bodeData.map((d) => `${xFromF(d.freq)},${height - ((d.mag - magMin) / Math.max(1e-6, magMax - magMin)) * height}`).join(" ");
        const phasePts = bodeData.map((d) => `${xFromF(d.freq)},${height - ((d.phase - phaseMin) / Math.max(1e-6, phaseMax - phaseMin)) * height}`).join(" ");
        return (
            <svg width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet">
                {[0, 1, 2, 3, 4].map((i) => (
                    <line key={`h-${i}`} x1={0} y1={(i / 4) * height} x2={width} y2={(i / 4) * height} stroke="white" strokeOpacity={0.05} />
                ))}
                <polyline points={magPts} fill="none" stroke="#ffffff" strokeWidth={2} strokeLinecap="round" />
                <polyline points={phasePts} fill="none" stroke="#FFBF00" strokeWidth={2} strokeLinecap="round" strokeDasharray="6 3" />
            </svg>
        );
    };

    const fmt = (v: number, suffix: string) => (Number.isFinite(v) ? `${v.toFixed(2)} ${suffix}` : "N/A");

    return (
        <div className="relative min-h-screen overflow-hidden">
            <WindFlow />
            <div className="pt-24" />
            <div className="relative z-10 flex flex-col lg:flex-row gap-6 px-8 pb-8">
                <aside className="w-full lg:w-80 flex-shrink-0 rounded-lg overflow-hidden border border-white/10">
                    <div className="p-6 backdrop-blur-xl bg-black/40">
                        <h2 className="text-xs font-mono tracking-[0.3em] text-white/50 uppercase mb-6">LQR Weighting</h2>
                        <div className="space-y-6">
                            {sliderConfig.map((item) => (
                                <div key={item.key} className="space-y-3">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <span className="text-sm font-medium text-white">{item.label}</span>
                                            <span className="block text-[10px] font-mono text-white/40">{item.sublabel}</span>
                                        </div>
                                        <span className="text-sm font-mono text-accent">{gains[item.key]}</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={1}
                                        max={100}
                                        value={gains[item.key]}
                                        onChange={(e) => setGains((prev) => ({ ...prev, [item.key]: Number(e.target.value) }))}
                                        className="w-full accent-accent"
                                    />
                                </div>
                            ))}
                        </div>
                        <div className="mt-8 pt-6 border-t border-white/10">
                            <h3 className="text-[10px] font-mono tracking-[0.2em] text-white/40 uppercase mb-4">K-Matrix (Sample)</h3>
                            <div className="grid grid-cols-3 gap-2 font-mono text-xs">
                                {kEntries.map((val, i) => (
                                    <div key={i} className="bg-white/5 rounded px-2 py-1 text-center text-white/70">{val.toFixed(3)}</div>
                                ))}
                            </div>
                        </div>
                    </div>
                </aside>

                <main className="flex-1 space-y-6">
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-bold tracking-tight text-white mb-2">Control Analysis</h1>
                        <p className="text-sm text-white/40 font-mono text-center">Model-derived linear response from trim linearization</p>
                    </div>

                    <div className="glass-panel rounded-lg p-6 bg-black/60">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-mono tracking-[0.2em] text-white/50 uppercase">Closed-loop Step Response</h3>
                            <span className="px-2 py-1 bg-accent/20 text-accent rounded text-[10px] font-mono">{status}</span>
                        </div>
                        <div className="telemetry-grid rounded-lg p-4">{renderStabilityGraph()}</div>
                    </div>

                    <div className="glass-panel rounded-lg p-6 bg-black/60">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-mono tracking-[0.2em] text-white/50 uppercase">Bode (theta/elevator)</h3>
                        </div>
                        <div className="telemetry-grid rounded-lg p-4">{renderBodePlot()}</div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        {[
                            { label: "Gain Margin", value: fmt(metrics.gainMarginDb, "dB") },
                            { label: "Phase Margin", value: fmt(metrics.phaseMarginDeg, "deg") },
                            { label: "Bandwidth", value: fmt(metrics.bandwidthHz, "Hz") },
                            { label: "Settling Time", value: fmt(metrics.settlingTimeS, "s") },
                            { label: "Overshoot", value: fmt(metrics.overshootPct, "%") }
                        ].map((metric) => (
                            <div key={metric.label} className="glass-panel rounded-lg p-4 bg-black/60 text-center">
                                <span className="block text-[10px] font-mono text-white/40 uppercase tracking-wider mb-2">{metric.label}</span>
                                <span className="block text-lg font-mono text-white">{metric.value}</span>
                            </div>
                        ))}
                    </div>

                    <div className="glass-panel rounded-lg p-6 bg-black/60">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-xs font-mono tracking-[0.2em] text-white/50 uppercase">Eigenmodes (A-Matrix)</h3>
                            <span className="text-[10px] font-mono text-white/40">Heuristic labels</span>
                        </div>
                        <div className="space-y-2">
                            {modes.map((m, i) => (
                                <div key={`${m.mode}-${i}`} className="grid grid-cols-12 items-center gap-2 rounded bg-white/[0.03] px-3 py-2">
                                    <span className="col-span-4 text-[10px] font-mono text-white/70 uppercase">{m.mode}</span>
                                    <span className="col-span-4 text-[11px] font-mono text-white/90">{m.eigenvalue}</span>
                                    <span className="col-span-2 text-[10px] font-mono text-white/50">zeta {m.damping}</span>
                                    <span className={`col-span-2 text-[10px] font-mono text-right ${m.stable ? "text-accent" : "text-red-400"}`}>
                                        {m.stable ? "Stable" : "Unstable"}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default ControlAnalysisPage;
