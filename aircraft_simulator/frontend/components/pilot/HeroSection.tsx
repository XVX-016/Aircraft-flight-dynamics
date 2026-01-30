"use client";

interface HeroSectionProps {
    onLaunch: () => void;
}

const HeroSection = ({ onLaunch }: HeroSectionProps) => {
    return (
        <section className="relative z-10 flex flex-col items-center justify-center min-h-screen px-8 overflow-hidden">
            {/* Background Radar Grid (Simulated with CSS) */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-20">
                <div className="w-[800px] h-[800px] border border-white/10 rounded-full" />
                <div className="absolute w-[600px] h-[600px] border border-white/5 rounded-full" />
                <div className="absolute w-[400px] h-[400px] border border-white/5 rounded-full" />
                <div className="absolute w-px h-full bg-white/5" />
                <div className="absolute w-full h-px bg-white/5" />
            </div>

            {/* Logo/Brand */}
            <div
                className="absolute top-8 left-8 opacity-0 animate-fade-in"
                style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}
            >
                <span className="text-xs font-mono tracking-[0.3em] text-white/40">ADCS-SIM</span>
            </div>

            {/* Main Content */}
            <div className="text-center z-20">
                <div className="mb-12 relative">
                    <h1
                        className="text-[clamp(4rem,15vw,12rem)] font-black leading-[0.8] tracking-tighter text-white opacity-0 animate-fade-in-up"
                        style={{ animationDelay: '0.4s', animationFillMode: 'forwards' }}
                    >
                        Precision
                        <br />
                        Flight
                    </h1>

                    <h2
                        className="text-[clamp(2rem,6vw,5rem)] font-bold tracking-tight mt-2 opacity-0 animate-fade-in-up text-stroke"
                        style={{
                            animationDelay: '0.6s',
                            animationFillMode: 'forwards',
                        }}
                    >
                        Dynamics & Control
                    </h2>
                </div>

                {/* Subtitle */}
                <p
                    className="text-[10px] md:text-xs text-white/40 tracking-[0.3em] uppercase mb-16 max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up"
                    style={{ animationDelay: '0.8s', animationFillMode: 'forwards' }}
                >
                    Advanced attitude determination and control simulation platform
                </p>

                {/* CTA Button */}
                <div className="flex flex-col items-center gap-12 opacity-0 animate-scale-in" style={{ animationDelay: '1s', animationFillMode: 'forwards' }}>
                    <button
                        onClick={onLaunch}
                        className="px-12 py-4 border border-white/20 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-all duration-300 text-xs font-mono tracking-[0.3em] uppercase"
                    >
                        Launch Pilot Deck
                    </button>
                    {/* Scroll indicator removed */}
                </div>
            </div>
        </section>
    );
};

export default HeroSection;
