import { Card } from "@/components/ui/Card";

export default function FeaturesSection() {
    return (
        <section className="py-32 border-b border-white/5 bg-black relative z-10">
            <div className="max-w-[1400px] mx-auto px-8">

                <h2 className="text-2xl font-mono tracking-[0.25em] uppercase text-white mb-16">
                    Platform Capabilities
                </h2>

                <div className="grid md:grid-cols-3 gap-8">

                    <Card showAccent>
                        <div>
                            <h3 className="text-sm font-mono tracking-[0.2em] uppercase text-white mb-4">Simulation Engine</h3>
                            <p className="text-sm text-white/50 leading-relaxed mt-4">
                                High fidelity 6-DOF dynamics modeling with configurable control laws and environmental factors.
                            </p>
                        </div>
                    </Card>

                    <Card showAccent>
                        <div>
                            <h3 className="text-sm font-mono tracking-[0.2em] uppercase text-white mb-4">Control Systems</h3>
                            <p className="text-sm text-white/50 leading-relaxed mt-4">
                                LQR, PID, adaptive control, and state feedback experimentation for stability augmentation.
                            </p>
                        </div>
                    </Card>

                    <Card showAccent>
                        <div>
                            <h3 className="text-sm font-mono tracking-[0.2em] uppercase text-white mb-4">Estimation Suite</h3>
                            <p className="text-sm text-white/50 leading-relaxed mt-4">
                                EKF, UKF and sensor fusion modules for precise attitude determination and state estimation.
                            </p>
                        </div>
                    </Card>

                </div>
            </div>
        </section>
    );
}
