import { AircraftConfig } from "@/lib/simulation/types/aircraft";

interface AircraftSpecsProps {
    config: AircraftConfig;
}

export default function AircraftSpecs({ config }: AircraftSpecsProps) {
    return (
        <div className="space-y-6">
            {/* Mass Properties */}
            <div className="hud-panel">
                <h3 className="text-xs font-mono text-white/50 uppercase tracking-widest mb-4">Mass & Inertia</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <span className="block text-[10px] text-white/30 uppercase">Empty Mass</span>
                        <span className="text-lg font-mono text-white">{config.massProps.mass} <span className="text-xs text-white/50">kg</span></span>
                    </div>
                    <div>
                        <span className="block text-[10px] text-white/30 uppercase">CG Position</span>
                        <span className="text-sm font-mono text-white">
                            [{config.massProps.cg.x}, {config.massProps.cg.y}, {config.massProps.cg.z}]
                        </span>
                    </div>
                </div>
                <div className="mt-4 pt-4 border-t border-white/5">
                    <span className="block text-[10px] text-white/30 uppercase mb-2">Inertia Tensor</span>
                    <div className="grid grid-cols-3 gap-2 text-xs font-mono text-white/70">
                        <div className="bg-white/5 p-1 text-center">{config.massProps.Ixx}</div>
                        <div className="bg-white/5 p-1 text-center">0</div>
                        <div className="bg-white/5 p-1 text-center">{config.massProps.Ixz}</div>

                        <div className="bg-white/5 p-1 text-center">0</div>
                        <div className="bg-white/5 p-1 text-center">{config.massProps.Iyy}</div>
                        <div className="bg-white/5 p-1 text-center">0</div>

                        <div className="bg-white/5 p-1 text-center">{config.massProps.Ixz}</div>
                        <div className="bg-white/5 p-1 text-center">0</div>
                        <div className="bg-white/5 p-1 text-center">{config.massProps.Izz}</div>
                    </div>
                </div>
            </div>

            {/* Geometry */}
            <div className="hud-panel">
                <h3 className="text-xs font-mono text-white/50 uppercase tracking-widest mb-4">Geometry</h3>
                <div className="grid grid-cols-3 gap-4">
                    <div>
                        <span className="block text-[10px] text-white/30 uppercase">Wing Span</span>
                        <span className="text-sm font-mono text-white">{config.geometry.wingSpan} m</span>
                    </div>
                    <div>
                        <span className="block text-[10px] text-white/30 uppercase">Wing Area</span>
                        <span className="text-sm font-mono text-white">{config.geometry.wingArea} m²</span>
                    </div>
                    <div>
                        <span className="block text-[10px] text-white/30 uppercase">Mean Chord</span>
                        <span className="text-sm font-mono text-white">{config.geometry.chord} m</span>
                    </div>
                </div>
            </div>

            {/* Aerodynamics */}
            <div className="hud-panel">
                <h3 className="text-xs font-mono text-white/50 uppercase tracking-widest mb-4">Aerodynamics</h3>
                <div className="grid grid-cols-2 gap-x-8 gap-y-2 text-xs font-mono">
                    <div className="flex justify-between">
                        <span className="text-white/40">CL_alpha</span>
                        <span className="text-accent">{config.aero.CL_alpha}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/40">CD0</span>
                        <span className="text-accent">{config.aero.CD0}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/40">Cm_alpha</span>
                        <span className="text-accent">{config.aero.Cm_alpha}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/40">Cl_beta</span>
                        <span className="text-accent">{config.aero.Cl_beta}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-white/40">Cn_beta</span>
                        <span className="text-accent">{config.aero.Cn_beta}</span>
                    </div>
                </div>
            </div>

            {/* Propulsion */}
            <div className="hud-panel">
                <h3 className="text-xs font-mono text-white/50 uppercase tracking-widest mb-4">Propulsion</h3>
                {config.propulsion.map((engine, idx) => (
                    <div key={idx} className="mb-4 last:mb-0">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-[10px] text-white/30 uppercase">Engine {idx + 1}</span>
                            <span className="text-sm font-mono text-white">{engine.maxThrust} <span className="text-xs text-white/50">N</span></span>
                        </div>
                        <div className="text-[10px] font-mono text-white/40">
                            Pos: [{engine.position.x}, {engine.position.y}, {engine.position.z}]
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
