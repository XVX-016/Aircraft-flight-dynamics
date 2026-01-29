"use client";

import StatusPanel from './dashboard/StatusPanel';
import TelemetryPanel from './dashboard/TelemetryPanel';
import MissionPanel from './dashboard/MissionPanel';
import ControlPanel from './dashboard/ControlPanel';
import { useSimulationStore } from '@/stores/useSimulationStore';

interface DashboardProps {
    onInitialize: () => void;
}

const PilotDeck = ({ onInitialize }: DashboardProps) => {
    return (
        <section className="relative z-10 min-h-screen p-8 pt-24">
            {/* Dashboard Title */}
            <div className="text-center mb-12 opacity-0 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'forwards' }}>
                <h2 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">
                    Pilot Deck
                </h2>
                <h3 className="text-2xl font-bold tracking-tight text-white">
                    Flight Control Interface
                </h3>
            </div>

            {/* HUD Layout */}
            <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                <div className="flex justify-between items-start">
                    {/* Top Left - Status */}
                    <div className="pointer-events-auto w-80">
                        <StatusPanel />
                    </div>

                    {/* Top Right - Telemetry */}
                    <div className="pointer-events-auto w-80">
                        <TelemetryPanel />
                    </div>
                </div>

                <div className="flex justify-between items-end">
                    {/* Bottom Left - Mission */}
                    <div className="pointer-events-auto w-80">
                        <MissionPanel />
                    </div>

                    {/* Bottom Center - Initialize (If needed) */}
                    <div className="pointer-events-auto">
                        <button
                            onClick={onInitialize}
                            className="btn-glow-accent px-8 py-2 text-xs font-mono tracking-[0.2em] uppercase"
                        >
                            System Init
                        </button>
                    </div>

                    {/* Bottom Right - Controls */}
                    <div className="pointer-events-auto w-80">
                        <ControlPanel />
                    </div>
                </div>
            </div>

            {/* Dynamic Footer Data */}
            <div className="absolute bottom-8 left-0 right-0 flex justify-center pointer-events-none">
                <FooterData />
            </div>
        </section>
    );
};

function FooterData() {
    // We need a way to access these. 
    // SimulationStore has Position (NED). 
    // Lat/Lon is not simulated yet (Flat Earth). 
    // Show Sim State: ALT, VEL, HDG.
    const { position, velocity, orientation } = useSimulationStore();

    // orientation: [phi, theta, psi] (rad)
    const hdg = (orientation[2] * 180 / Math.PI).toFixed(0).padStart(3, '0');
    const alt = (-position[2]).toFixed(0); // NED z is down
    const vel = velocity.toFixed(0);

    return (
        <div className="flex items-center gap-12 text-[10px] font-mono text-white/40 tracking-[0.2em] bg-black/40 backdrop-blur-md px-6 py-2 rounded-full border border-white/5">
            <span>SYS: ACTIVE</span>
            <span>ALT: {alt} FT</span>
            <span>SPD: {vel} KTS</span>
            <span>HDG: {hdg}°</span>
            <span>SIM: 6DOF</span>
        </div>
    );
}


export default PilotDeck;
