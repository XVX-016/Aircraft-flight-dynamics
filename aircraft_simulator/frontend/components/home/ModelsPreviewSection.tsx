import Link from "next/link";

export default function ModelsPreviewSection() {
    const models = [
        {
            id: "aermacchi_mb-326",
            name: "Aermacchi MB-326",
            description: "Light military jet trainer and light attack aircraft.",
            specs: ["Subsonic", "Trainer", "Light Attack"]
        },
        {
            id: "f15e_strike_eagle_rigged",
            name: "F-15E Strike Eagle",
            description: "All-weather multirole strike fighter.",
            specs: ["Supersonic", "Multirole", "High Agility"]
        },
        {
            id: "fighterplane",
            name: "Generic Fighter",
            description: "Baseline aerodynamic model for control testing.",
            specs: ["Experimental", "6DOF", "Unstable"]
        },
        {
            id: "helicopter",
            name: "Rotorcraft",
            description: "Vertical lift platform for hover stability analysis.",
            specs: ["VTOL", "Hover", "Non-Linear"]
        }
    ];

    return (
        <section className="py-32 bg-black relative z-10">
            <div className="max-w-[1400px] mx-auto px-8">

                <h2 className="text-2xl font-mono tracking-[0.25em] uppercase text-white mb-16">
                    Available Models
                </h2>

                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-10">
                    {models.map((model) => (
                        <Link href={`/flight?model=${model.id}`} key={model.id} className="block group font-mono">
                            <div className="group border border-white/10 rounded-xl overflow-hidden bg-white/5 hover:border-white/30 transition-all duration-300 h-full flex flex-col">

                                {/* Thumbnail Placeholder */}
                                <div className="h-40 bg-white/5 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent z-10" />
                                    {/* We can add actual Images here later */}
                                    <div className="absolute inset-0 flex items-center justify-center text-white/20 text-xs tracking-widest uppercase">
                                        Preview
                                    </div>
                                </div>

                                <div className="p-6 flex flex-col flex-1">
                                    <h3 className="text-lg font-semibold mb-3 text-white group-hover:text-accent transition-colors">
                                        {model.name}
                                    </h3>
                                    <p className="text-xs text-white/50 leading-relaxed mb-6 flex-1">
                                        {model.description}
                                    </p>

                                    <div className="flex flex-wrap gap-2 mt-auto">
                                        {model.specs.map(spec => (
                                            <span key={spec} className="text-[10px] uppercase tracking-wider text-white/30 bg-white/5 px-2 py-1 rounded">
                                                {spec}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </section>
    );
}
