"use client";

import Link from "next/link";
import { useAircraftContext } from "@/context/AircraftContext";
import { Check, ShieldCheck, ArrowRight, AlertTriangle } from "lucide-react";

interface AircraftCardProps {
    title: string;
    description: string;
    features: string[];
    validated: boolean;
    research?: boolean;
    onClick: () => void;
}

const AircraftCard = ({ title, description, features, onClick }: AircraftCardProps) => (
    <div className="group relative p-8 border border-white/10 bg-white/[0.02] hover:bg-white/[0.04] transition-all duration-300">
        <div className="flex justify-between items-start mb-6">
            <div>
                <h3 className="text-sm font-mono font-bold text-white group-hover:text-blue-400 transition-colors uppercase tracking-[0.2em]">{title}</h3>
                <p className="text-[10px] text-neutral-500 uppercase tracking-widest mt-1">{description}</p>
            </div>
        </div>

        <div className="grid grid-cols-1 gap-2 mb-8">
            {features.map((feature) => (
                <div key={feature} className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                    <Check className="w-3 h-3 text-blue-500/50" />
                    {feature}
                </div>
            ))}
        </div>

        <Link
            href="/hangar"
            onClick={onClick}
            className="inline-flex items-center gap-2 text-[10px] font-bold text-white bg-white/10 hover:bg-white/20 px-6 py-3 uppercase tracking-widest transition-colors w-full justify-center"
        >
            Load Configuration
            <ArrowRight className="w-3 h-3" />
        </Link>
    </div>
);

const ValidatedAircraft = () => {
    // Correctly using the store hook to get the setAircraftId function
    const { setAircraft } = useAircraftContext();

    return (
        <section className="py-24 bg-neutral-950 border-b border-white/5">
            <div className="max-w-[1400px] mx-auto px-6 md:px-8">

                <div className="max-w-2xl text-left mb-16">
                    <h2 className="text-lg md:text-xl font-mono tracking-[0.2em] text-white/60 uppercase mb-6 pointer-events-none">
                        Validated Aircraft Models
                    </h2>
                    <p className="text-neutral-400 leading-relaxed max-w-xl">
                        Strict configuration control for academic submission.
                        Simulation locked to validated datasets derived from POH performance data and published research models.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

                    <AircraftCard
                        title="Cessna 172R"
                        description="Stable General Aviation Platform"
                        validated={true}
                        features={["Nonlinear Aero", "Trim Envelope Validated", "Classical Stability Modes"]}
                        onClick={() => void setAircraft("cessna_172r")}
                    />

                    <AircraftCard
                        title="F-16 Falcon"
                        description="Relaxed Static Stability Research Model"
                        validated={false}
                        features={["Stevens & Lewis Dataset", "Unstable Short Period", "High-Bandwidth Control"]}
                        onClick={() => void setAircraft("f16_research")}
                    />

                    <div className="p-8 border border-dashed border-white/10 flex flex-col items-center justify-center text-center opacity-50 hover:opacity-100 transition-opacity">
                        <div className="w-12 h-12 rounded-full border border-white/10 flex items-center justify-center mb-4">
                            <span className="text-xl text-white/30">+</span>
                        </div>
                        <span className="text-xs font-mono text-neutral-400 uppercase tracking-widest">
                            Modular Architecture <br /> Ready
                        </span>
                    </div>

                </div>
            </div>
        </section>
    );
};

export default ValidatedAircraft;
