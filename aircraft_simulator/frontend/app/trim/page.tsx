"use client";

import { StabilityOverview } from "@/components/analysis/StabilityOverview";
import { ModeTable } from "@/components/analysis/ModeTable";
import { SpectralPlot } from "@/components/analysis/SpectralPlot";
import { useAircraftContext } from "@/context/AircraftContext";
import { useEffect, useState } from "react";

export default function TrimPage() {
    const { selectedAircraftId, flightCondition, setFlightCondition, refreshCoreAnalysis, computed, loading, error } = useAircraftContext();
    const [velocityInput, setVelocityInput] = useState(String(flightCondition.velocity));
    const [altitudeInput, setAltitudeInput] = useState(String(flightCondition.altitude));

    useEffect(() => {
        setVelocityInput(String(flightCondition.velocity));
        setAltitudeInput(String(flightCondition.altitude));
    }, [flightCondition.altitude, flightCondition.velocity]);

    return (
        <div className="min-h-screen bg-neutral-950 text-white relative overflow-hidden pt-24 px-8 pb-12">
            <div className="max-w-[1400px] mx-auto">
                <header className="mb-12 border-b border-white/5 pb-6">
                    <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">Equilibrium</h1>
                    <h2 className="text-3xl font-bold text-white tracking-tight">Trim + Stability Summary</h2>
                </header>
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    <div className="lg:col-span-4 space-y-6">
                        <div className="hud-panel p-6 border border-white/10 bg-white/[0.02] rounded-xl space-y-4">
                            <div className="text-[10px] uppercase text-white/40">Flight Condition</div>
                            <label className="block"><span className="block text-[10px] uppercase text-white/40 mb-1">Airspeed (m/s)</span><input type="number" value={velocityInput} onChange={(e) => setVelocityInput(e.target.value)} className="w-full bg-black/40 border border-white/10 px-3 py-2 text-sm font-mono text-white" /></label>
                            <label className="block"><span className="block text-[10px] uppercase text-white/40 mb-1">Altitude (m)</span><input type="number" value={altitudeInput} onChange={(e) => setAltitudeInput(e.target.value)} className="w-full bg-black/40 border border-white/10 px-3 py-2 text-sm font-mono text-white" /></label>
                            <button onClick={() => void setFlightCondition({ velocity: Number(velocityInput), altitude: Number(altitudeInput) })} disabled={!selectedAircraftId || loading} className="w-full border border-white/20 bg-white/5 text-white text-xs font-bold uppercase tracking-widest py-3">{loading ? "Computing..." : "Recompute Equilibrium"}</button>
                            <button onClick={() => void refreshCoreAnalysis()} disabled={!selectedAircraftId || loading} className="w-full border border-white/10 bg-black/40 text-white text-xs font-bold uppercase tracking-widest py-3">Refresh Backend</button>
                        </div>
                        {error && <div className="p-4 rounded border border-red-500/20 bg-red-500/5 text-xs font-mono text-red-300">Backend unavailable. {error}</div>}
                    </div>
                    <div className="lg:col-span-8 space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><span className="block text-[10px] text-white/30 uppercase mb-1">Alpha</span><span className="text-xl font-mono text-white">{computed.trim ? computed.trim.alpha_rad.toFixed(4) : "--"}</span></div>
                            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><span className="block text-[10px] text-white/30 uppercase mb-1">Theta</span><span className="text-xl font-mono text-white">{computed.trim?.theta_rad !== undefined ? computed.trim.theta_rad.toFixed(4) : "--"}</span></div>
                            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><span className="block text-[10px] text-white/30 uppercase mb-1">Elevator</span><span className="text-xl font-mono text-white">{computed.trim ? computed.trim.elevator_rad.toFixed(4) : "--"}</span></div>
                            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><span className="block text-[10px] text-white/30 uppercase mb-1">Throttle</span><span className="text-xl font-mono text-white">{computed.trim ? computed.trim.throttle.toFixed(3) : "--"}</span></div>
                            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg"><span className="block text-[10px] text-white/30 uppercase mb-1">Residual</span><span className="text-xl font-mono text-white">{computed.trim ? computed.trim.residual_norm.toExponential(2) : "--"}</span></div>
                        </div>
                        <StabilityOverview modal={computed.modalAnalysis} />
                        <ModeTable modes={computed.modalAnalysis?.modes} />
                        <SpectralPlot openLoop={computed.eigenvalues ?? []} title="Open-Loop Spectrum" />
                    </div>
                </div>
            </div>
        </div>
    );
}
