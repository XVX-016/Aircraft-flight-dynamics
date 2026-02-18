import { AircraftData } from "@/context/AircraftContext";

interface AircraftSpecsProps {
    aircraft: AircraftData | null;
}

export default function AircraftSpecs({ aircraft }: AircraftSpecsProps) {
    if (!aircraft) {
        return (
            <div className="hud-panel p-4 text-xs font-mono text-white/50">
                No aircraft data loaded. Select an aircraft to view specifications.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="hud-panel">
                <h3 className="text-xs font-mono text-white/50 uppercase tracking-widest mb-4">Mass & Inertia</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="block text-[10px] text-white/30 uppercase">Empty Mass</span>
                        <span className="text-lg font-mono text-white">{aircraft.inertia.mass} <span className="text-xs text-white/50">kg</span></span>
                    </div>
                    <div>
                        <span className="block text-[10px] text-white/30 uppercase">CG Position</span>
                        <span className="text-sm font-mono text-white">{aircraft.geometry.cgLocation}</span>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                    <span className="block text-[10px] text-white/30 uppercase mb-2">Inertia Tensor</span>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono text-white/70">
                        <div className="bg-white/5 p-1 text-center">{aircraft.inertia.Ixx}</div>
                        <div className="bg-white/5 p-1 text-center">0</div>
                        <div className="bg-white/5 p-1 text-center">{aircraft.inertia.Ixz}</div>

                        <div className="bg-white/5 p-1 text-center">0</div>
                        <div className="bg-white/5 p-1 text-center">{aircraft.inertia.Iyy}</div>
                        <div className="bg-white/5 p-1 text-center">0</div>

                        <div className="bg-white/5 p-1 text-center">{aircraft.inertia.Ixz}</div>
                        <div className="bg-white/5 p-1 text-center">0</div>
                        <div className="bg-white/5 p-1 text-center">{aircraft.inertia.Izz}</div>
                    </div>
                </div>
            </div>

            <div className="hud-panel">
                <h3 className="text-xs font-mono text-white/50 uppercase tracking-widest mb-4">Geometry</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <span className="block text-[10px] text-white/30 uppercase">Wing Span</span>
                        <span className="text-sm font-mono text-white">{aircraft.geometry.wingspan} m</span>
                    </div>
                    <div>
                        <span className="block text-[10px] text-white/30 uppercase">Wing Area</span>
                        <span className="text-sm font-mono text-white">{aircraft.geometry.wingArea} m²</span>
                    </div>
                    <div>
                        <span className="block text-[10px] text-white/30 uppercase">Mean Chord</span>
                        <span className="text-sm font-mono text-white">{aircraft.geometry.meanAerodynamicChord} m</span>
                    </div>
                </div>
            </div>

            <div className="hud-panel">
                <h3 className="text-xs font-mono text-white/50 uppercase tracking-widest mb-4">Aerodynamics</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                        <span className="text-white/40">Xu</span>
                        <span className="text-accent">{aircraft.aero.Xu}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/40">Zw</span>
                        <span className="text-accent">{aircraft.aero.Zw}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/40">Mw</span>
                        <span className="text-accent">{aircraft.aero.Mw}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/40">Lp</span>
                        <span className="text-accent">{aircraft.aero.Lp}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/40">Nr</span>
                        <span className="text-accent">{aircraft.aero.Nr}</span>
                    </div>
                </div>
            </div>

            <div className="hud-panel">
                <h3 className="text-xs font-mono text-white/50 uppercase tracking-widest mb-2">Data Source</h3>
                <div className="text-[10px] font-mono text-white/60">{aircraft.metadata.source}</div>
                {aircraft.metadata.notes && (
                    <div className="text-[10px] font-mono text-white/40 mt-1">{aircraft.metadata.notes}</div>
                )}
            </div>
        </div>
    );
}
