"use client";

import AircraftSpecs from "@/components/hangar/AircraftSpecs";
import HangarViewer from "@/components/hangar/HangarViewer";
import Navigation from "@/components/pilot/Navigation";
import defaultAircraft from "@/lib/simulation/data/default_aircraft.json";
import { AircraftConfig } from "@/lib/simulation/types/aircraft";
import { toast } from "sonner"; // Assuming sonner is installed/used

// Cast the default json to AircraftConfig to ensure types match regardless of strict json import
const aircraft: AircraftConfig = defaultAircraft as unknown as AircraftConfig;

export default function HangarPage() {

    const handleNavigate = (section: string) => {
        if (section === 'simulator') {
            window.location.href = '/'; // Simple nav for now
        } else {
            toast(`Section Access: ${section}`, {
                description: 'Module loading...',
            });
        }
    };

    return (
        <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
            {/* Navigation */}
            <Navigation onNavigate={handleNavigate} />

            <main className="pt-24 px-8 pb-12 max-w-[1920px] mx-auto">
                <header className="mb-8 flex items-end justify-between">
                    <div>
                        <h1 className="text-xs font-mono tracking-[0.4em] text-white/40 uppercase mb-2">Aircraft Hangar</h1>
                        <h2 className="text-3xl font-bold text-white tracking-tight">Configuration & Analysis</h2>
                    </div>
                    <div className="flex gap-4">
                        <button className="btn-glow text-xs">Import JSON</button>
                        <button className="btn-glow-primary text-xs">Load Configuration</button>
                    </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-200px)]">
                    {/* Left: 3D Viewer */}
                    <div className="lg:col-span-8 h-full">
                        <HangarViewer config={aircraft} />
                    </div>

                    {/* Right: Specifications */}
                    <div className="lg:col-span-4 h-full overflow-y-auto pr-2 custom-scrollbar">
                        <AircraftSpecs config={aircraft} />
                    </div>
                </div>
            </main>

            {/* Background Effects */}
            <div className="fixed inset-0 pointer-events-none z-[-1]">
                <div className="absolute inset-0 bg-gradient-to-b from-stealth-charcoal to-background" />
                <div className="absolute inset-0 carbon-texture opacity-20" />
            </div>
        </div>
    );
}
