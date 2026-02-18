"use client";

import { Activity, Cpu, Layers, LucideIcon } from "lucide-react";

interface CapabilityCardProps {
    icon: LucideIcon;
    title: string;
    description: string;
    features: string[];
}

const CapabilityCard = ({ icon: Icon, title, description, features }: CapabilityCardProps) => (
    <div className="group relative p-8 rounded-none border border-white/5 bg-black/40 backdrop-blur-sm hover:border-white/20 transition-all duration-300">

        <div className="relative z-10">
            <div className="flex items-center gap-4 mb-6">
                <div className="w-8 h-8 flex items-center justify-center text-white/50 group-hover:text-blue-400 transition-colors">
                    <Icon className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-mono font-bold text-white uppercase tracking-[0.2em]">{title}</h3>
            </div>

            <p className="text-xs text-neutral-400 mb-8 leading-relaxed h-12">
                {description}
            </p>

            <ul className="space-y-3 border-t border-white/5 pt-6">
                {features.map((feature, i) => (
                    <li key={i} className="flex items-center gap-3 text-[10px] font-mono text-neutral-500 uppercase tracking-widest group-hover:text-neutral-300 transition-colors">
                        <div className="w-1 h-1 rounded-full bg-white/20 group-hover:bg-blue-500/80 transition-colors" />
                        {feature}
                    </li>
                ))}
            </ul>
        </div>
    </div>
);

const CapabilitiesGrid = () => {
    return (
        <section className="py-24 bg-black border-b border-white/5 relative">
            <div className="max-w-[1400px] mx-auto px-6 md:px-8">

                {/* Section Header */}
                <div className="max-w-2xl mb-16">
                    <h2 className="text-lg md:text-xl font-mono tracking-[0.2em] text-white/60 uppercase mb-4 pointer-events-none">
                        System Capabilities
                    </h2>
                </div>

                {/* Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                    <CapabilityCard
                        icon={Layers}
                        title="Flight Dynamics"
                        description="Deterministic 6-DOF simulation with quaternion-based kinematics and nonlinear aerodynamics."
                        features={[
                            "Nonlinear Equations of Motion",
                            "Numerical Trim Solver",
                            "Jacobian Linearization",
                            "Eigenvalue Mode Analysis"
                        ]}
                    />

                    <CapabilityCard
                        icon={Cpu}
                        title="Control Design"
                        description="Model-based control synthesis using linearized dynamics and optimal control theory."
                        features={[
                            "LQR Gain Synthesis",
                            "State-Space Analysis",
                            "Closed-Loop Pole Tracking",
                            "Stability Margins"
                        ]}
                    />

                    <CapabilityCard
                        icon={Activity}
                        title="State Estimation"
                        description="Extended Kalman Filter implementation with rigorous consistency checking."
                        features={[
                            "EKF with Numerical Jacobians",
                            "NEES/NIS Consistency Metrics",
                            "Observability Analysis",
                            "Adversarial Noise Injection"
                        ]}
                    />
                </div>
            </div>
        </section>
    );
};

export default CapabilitiesGrid;
