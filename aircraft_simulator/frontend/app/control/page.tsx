"use client";

import { SpectralPlot } from "@/components/analysis/SpectralPlot";
import { TimeSeriesPlot } from "@/components/analysis/TimeSeriesPlot";
import { useAircraftContext } from "@/context/AircraftContext";
import { computeStepMetrics } from "@/lib/stepMetrics";
import { useEffect, useMemo, useState } from "react";

function fmt(v: number | null | undefined, d = 3) {
    if (v === null || v === undefined || !Number.isFinite(v)) return "--";
    return v.toFixed(d);
}

export default function ControlPage() {
    const { selectedAircraftId, flightCondition, setFlightCondition, getCachedAnalysis, runControlAnalysis, runStepResponse } = useAircraftContext();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [qPitchMult, setQPitchMult] = useState(1.0);
    const [qSpeedMult, setQSpeedMult] = useState(1.0);
    const [rEffortMult, setREffortMult] = useState(1.0);
    const [stepChannel, setStepChannel] = useState("elevator");
    const control = getCachedAnalysis("control") as Record<string, any> | undefined;
    const step = getCachedAnalysis("stepResponse") as Record<string, any> | undefined;

    const fetchAll = async () => {
        if (!selectedAircraftId) return;
        setLoading(true);
        setError(null);
        try {
            await runControlAnalysis({ q_pitch_mult: qPitchMult, q_speed_mult: qSpeedMult, r_effort_mult: rEffortMult });
            await runStepResponse({ input_channel: stepChannel, duration_s: 30, include_closed_loop: true, include_open_loop: true });
        } catch (e) {
            setError(e instanceof Error ? e.message : "Backend unavailable");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        void fetchAll();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedAircraftId]);

    const stableOpen = useMemo(() => (control ? control.open_loop?.max_real_eig <= 0 : false), [control]);
    const stableClosed = useMemo(() => (control ? control.closed_loop?.max_real_eig <= 0 : false), [control]);

    const airspeedMetrics = useMemo(() => {
        const time = step?.time_s as number[] | undefined;
        const values = step?.traces?.closed_loop?.airspeed_mps as number[] | undefined;
        if (!time?.length || !values?.length) return null;
        return computeStepMetrics({ time, values, reference: values[0] });
    }, [step]);

    const pitchMetrics = useMemo(() => {
        const time = step?.time_s as number[] | undefined;
        const values = step?.traces?.closed_loop?.pitch_rad as number[] | undefined;
        if (!time?.length || !values?.length) return null;
        return computeStepMetrics({ time, values, reference: values[0] });
    }, [step]);

    return (
        <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden pt-24 px-8 pb-12">
            <div className="max-w-[1500px] mx-auto">
                <header className="mb-12 border-b border-white/5 pb-6">
                    <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">Control</h1>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Environmental LQR + Step Response</h2>
                </header>
                {!selectedAircraftId && <div className="p-4 border border-white/10 bg-white/5 text-xs font-mono text-white/60 mb-6">No aircraft selected. Choose a model first.</div>}
                {error && <div className="p-4 border border-red-500/20 bg-red-500/5 text-xs font-mono text-red-300 mb-6">{error}</div>}
                <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
                    <div className="xl:col-span-3 space-y-6">
                        <div className="hud-panel p-6 border border-white/10 bg-white/[0.02] rounded-xl space-y-4">
                            <div className="text-[10px] uppercase text-white/40">Environment + Control</div>
                            <label className="block text-[10px] font-mono uppercase text-white/50">Airspeed {flightCondition.velocity.toFixed(0)} m/s<input type="range" min={30} max={220} step={1} value={flightCondition.velocity} onChange={(e) => void setFlightCondition({ velocity: Number(e.target.value) })} className="w-full mt-2" /></label>
                            <label className="block text-[10px] font-mono uppercase text-white/50">Altitude {flightCondition.altitude.toFixed(0)} m<input type="range" min={0} max={12000} step={100} value={flightCondition.altitude} onChange={(e) => void setFlightCondition({ altitude: Number(e.target.value) })} className="w-full mt-2" /></label>
                            <label className="block text-[10px] font-mono uppercase text-white/50">ISA offset {flightCondition.isaTempOffsetC.toFixed(0)} C<input type="range" min={-30} max={30} step={1} value={flightCondition.isaTempOffsetC} onChange={(e) => void setFlightCondition({ isaTempOffsetC: Number(e.target.value) })} className="w-full mt-2" /></label>
                            <label className="block text-[10px] font-mono uppercase text-white/50">Headwind {flightCondition.headwind.toFixed(0)} m/s<input type="range" min={0} max={30} step={1} value={flightCondition.headwind} onChange={(e) => void setFlightCondition({ headwind: Number(e.target.value) })} className="w-full mt-2" /></label>
                            <label className="block text-[10px] font-mono uppercase text-white/50">Crosswind {flightCondition.crosswind.toFixed(0)} m/s<input type="range" min={0} max={30} step={1} value={flightCondition.crosswind} onChange={(e) => void setFlightCondition({ crosswind: Number(e.target.value) })} className="w-full mt-2" /></label>
                            <label className="block text-[10px] font-mono uppercase text-white/50">Pitch weight {qPitchMult.toFixed(1)}x<input type="range" min={0.2} max={3} step={0.1} value={qPitchMult} onChange={(e) => setQPitchMult(Number(e.target.value))} className="w-full mt-2" /></label>
                            <label className="block text-[10px] font-mono uppercase text-white/50">Speed weight {qSpeedMult.toFixed(1)}x<input type="range" min={0.2} max={3} step={0.1} value={qSpeedMult} onChange={(e) => setQSpeedMult(Number(e.target.value))} className="w-full mt-2" /></label>
                            <label className="block text-[10px] font-mono uppercase text-white/50">Control effort {rEffortMult.toFixed(1)}x<input type="range" min={0.2} max={3} step={0.1} value={rEffortMult} onChange={(e) => setREffortMult(Number(e.target.value))} className="w-full mt-2" /></label>
                            <label className="block text-[10px] font-mono uppercase text-white/50">Step channel<select value={stepChannel} onChange={(e) => setStepChannel(e.target.value)} className="mt-2 w-full bg-black/40 border border-white/10 px-3 py-2 text-sm text-white"><option value="elevator">Elevator</option><option value="throttle">Throttle</option></select></label>
                            <button onClick={() => void fetchAll()} disabled={!selectedAircraftId || loading} className="w-full border border-white/20 bg-white/5 text-white text-xs font-bold uppercase tracking-widest py-3">{loading ? "Computing..." : "Recompute Workbench"}</button>
                        </div>
                    </div>
                    <div className="xl:col-span-9 space-y-6">
                        {control && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><div className="text-[10px] uppercase text-white/40 mb-1">Open-loop sigma max</div><div className={`text-sm font-mono ${stableOpen ? "text-emerald-300" : "text-amber-300"}`}>{fmt(control.open_loop?.max_real_eig, 4)}</div></div>
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><div className="text-[10px] uppercase text-white/40 mb-1">Closed-loop sigma max</div><div className={`text-sm font-mono ${stableClosed ? "text-emerald-300" : "text-amber-300"}`}>{fmt(control.closed_loop?.max_real_eig, 4)}</div></div>
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><div className="text-[10px] uppercase text-white/40 mb-1">Trim throttle</div><div className="text-sm font-mono text-white">{fmt(control.trim?.throttle, 3)}</div></div>
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><div className="text-[10px] uppercase text-white/40 mb-1">Trim elevator</div><div className="text-sm font-mono text-white">{fmt(control.trim?.elevator_rad, 4)}</div></div>
                                </div>
                                <SpectralPlot openLoop={control.open_loop?.eigenvalues ?? []} closedLoop={control.closed_loop?.eigenvalues ?? []} title="Open vs Closed Loop Spectral Shift" />
                            </>
                        )}
                        {step && (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><div className="text-[10px] uppercase text-white/40 mb-1">Airspeed overshoot</div><div className="text-sm font-mono text-white">{airspeedMetrics ? `${fmt(airspeedMetrics.peakOvershoot, 2)} %` : "--"}</div></div>
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><div className="text-[10px] uppercase text-white/40 mb-1">Airspeed settle</div><div className="text-sm font-mono text-white">{airspeedMetrics?.settlingTime == null ? "--" : `${fmt(airspeedMetrics.settlingTime, 2)} s`}</div></div>
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><div className="text-[10px] uppercase text-white/40 mb-1">Airspeed SS error</div><div className="text-sm font-mono text-white">{airspeedMetrics ? fmt(airspeedMetrics.steadyStateError, 3) : "--"}</div></div>
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><div className="text-[10px] uppercase text-white/40 mb-1">Airspeed rise</div><div className="text-sm font-mono text-white">{airspeedMetrics?.riseTime == null ? "--" : `${fmt(airspeedMetrics.riseTime, 2)} s`}</div></div>
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><div className="text-[10px] uppercase text-white/40 mb-1">Pitch settle</div><div className="text-sm font-mono text-white">{pitchMetrics?.settlingTime == null ? "--" : `${fmt(pitchMetrics.settlingTime, 2)} s`}</div></div>
                                    <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><div className="text-[10px] uppercase text-white/40 mb-1">Peak control effort</div><div className="text-sm font-mono text-white">{fmt(step.metrics?.control_effort_peak, 3)}</div></div>
                                </div>
                                <TimeSeriesPlot title="Airspeed Response" x={step.time_s ?? []} series={[{ label: "Open loop", values: step.traces?.open_loop?.airspeed_mps ?? [], color: "#60a5fa" }, { label: "Closed loop", values: step.traces?.closed_loop?.airspeed_mps ?? [], color: "#f87171" }]} />
                                <TimeSeriesPlot title="Pitch and Pitch-Rate Response" x={step.time_s ?? []} series={[{ label: "Theta open", values: step.traces?.open_loop?.pitch_rad ?? [], color: "#38bdf8" }, { label: "Theta closed", values: step.traces?.closed_loop?.pitch_rad ?? [], color: "#f97316" }, { label: "q closed", values: step.traces?.closed_loop?.pitch_rate_radps ?? [], color: "#a78bfa" }]} />
                                <TimeSeriesPlot title="Trajectory Arc" x={step.traces?.closed_loop?.ground_distance_m ?? []} series={[{ label: "Open altitude", values: step.traces?.open_loop?.altitude_m ?? [], color: "#60a5fa" }, { label: "Closed altitude", values: step.traces?.closed_loop?.altitude_m ?? [], color: "#f87171" }]} />
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
