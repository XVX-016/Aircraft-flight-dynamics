"use client";

export const PhilosophySection = () => (
    <section className="py-24 bg-black border-b border-white/5 text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900/10 to-transparent pointer-events-none" />
        <div className="max-w-4xl mx-auto px-6 relative z-10">
            <h2 className="text-lg md:text-xl font-mono tracking-[0.2em] text-white/60 uppercase mb-6 pointer-events-none">
                Engineering Philosophy
            </h2>
            <p className="text-neutral-400 leading-relaxed mb-12 max-w-2xl mx-auto">
                This system is built on <strong>deterministic modeling principles</strong>, emphasizing traceable state
                propagation, mathematically consistent linearization, and physically meaningful control synthesis.
                It rejects "black box" behavior in favor of transparent, equation-based validation.
            </p>

            <div className="flex flex-wrap justify-center gap-x-12 gap-y-4 text-[10px] font-mono uppercase tracking-[0.2em] text-white/30">
                <span>Deterministic Core</span>
                <span>•</span>
                <span>Modular Database</span>
                <span>•</span>
                <span>Academic Validation Mode</span>
            </div>
        </div>
    </section>
);
