import Link from "next/link";

// Inline SVG silhouettes for each model
function JetTrainerSilhouette() {
    return (
        <svg viewBox="0 0 200 80" className="w-32 h-auto opacity-30 group-hover:opacity-50 transition-opacity duration-500">
            <path d="M20,45 L60,42 L80,30 L100,42 L170,40 L180,35 L180,45 L170,44 L100,46 L80,55 L60,46 L20,48 Z" fill="currentColor" />
            <path d="M150,40 L160,25 L165,25 L160,40 Z" fill="currentColor" />
            <path d="M150,44 L160,58 L165,58 L160,44 Z" fill="currentColor" />
        </svg>
    );
}

function StrikeEagleSilhouette() {
    return (
        <svg viewBox="0 0 200 80" className="w-32 h-auto opacity-30 group-hover:opacity-50 transition-opacity duration-500">
            <path d="M15,42 L50,38 L70,25 L95,38 L160,36 L185,30 L185,42 L160,40 L95,44 L70,56 L50,44 L15,46 Z" fill="currentColor" />
            <path d="M130,38 L145,18 L152,18 L142,38 Z" fill="currentColor" />
            <path d="M130,44 L145,64 L152,64 L142,44 Z" fill="currentColor" />
            <path d="M75,38 L82,28 L86,28 L82,38 Z" fill="currentColor" />
            <path d="M75,44 L82,54 L86,54 L82,44 Z" fill="currentColor" />
        </svg>
    );
}

function GenericFighterSilhouette() {
    return (
        <svg viewBox="0 0 200 80" className="w-32 h-auto opacity-30 group-hover:opacity-50 transition-opacity duration-500">
            <path d="M10,40 L40,38 L55,20 L75,38 L170,36 L190,32 L190,48 L170,44 L75,42 L55,60 L40,42 L10,44 Z" fill="currentColor" />
            <path d="M140,38 L155,15 L160,15 L150,38 Z" fill="currentColor" />
            <path d="M140,42 L155,65 L160,65 L150,42 Z" fill="currentColor" />
        </svg>
    );
}

function RotorcraftSilhouette() {
    return (
        <svg viewBox="0 0 200 80" className="w-32 h-auto opacity-30 group-hover:opacity-50 transition-opacity duration-500">
            <ellipse cx="90" cy="42" rx="30" ry="18" fill="currentColor" />
            <path d="M120,40 L175,38 L178,36 L178,44 L175,42 L120,44 Z" fill="currentColor" />
            <path d="M170,38 L178,22 L182,22 L176,38 Z" fill="currentColor" />
            <line x1="30" y1="20" x2="160" y2="20" stroke="currentColor" strokeWidth="2" />
            <line x1="90" y1="24" x2="90" y2="20" stroke="currentColor" strokeWidth="2" />
            <path d="M80,58 L75,68 L105,68 L100,58 Z" fill="currentColor" />
        </svg>
    );
}

const silhouettes: Record<string, React.FC> = {
    "aermacchi_mb-326": JetTrainerSilhouette,
    "f15e_strike_eagle_rigged": StrikeEagleSilhouette,
    "fighterplane": GenericFighterSilhouette,
    "helicopter": RotorcraftSilhouette,
};

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
                    {models.map((model) => {
                        const Silhouette = silhouettes[model.id];
                        return (
                            <Link href={`/flight?model=${model.id}`} key={model.id} className="block group font-mono">
                                <div className="border border-white/10 overflow-hidden bg-black hover:border-white/20 hover:bg-neutral-950 transition-all duration-300 h-full flex flex-col">

                                    {/* Aircraft Silhouette Preview */}
                                    <div className="h-40 bg-neutral-950 relative overflow-hidden flex items-center justify-center text-white">
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent z-10 pointer-events-none" />
                                        {Silhouette && <Silhouette />}
                                    </div>

                                    <div className="p-6 flex flex-col flex-1">
                                        <h3 className="text-sm font-mono tracking-[0.15em] uppercase mb-3 text-white group-hover:text-accent transition-colors">
                                            {model.name}
                                        </h3>
                                        <p className="text-xs text-white/50 leading-relaxed mb-6 flex-1">
                                            {model.description}
                                        </p>

                                        <div className="flex flex-wrap gap-2 mt-auto">
                                            {model.specs.map(spec => (
                                                <span key={spec} className="text-[10px] uppercase tracking-wider text-white/30 bg-white/5 px-2 py-1">
                                                    {spec}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </section>
    );
}

