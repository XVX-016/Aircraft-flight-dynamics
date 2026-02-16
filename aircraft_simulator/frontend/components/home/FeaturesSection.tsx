export default function FeaturesSection() {
    return (
        <section className="py-32 border-b border-white/5 bg-black relative z-10">
            <div className="max-w-[1400px] mx-auto px-8">

                <h2 className="text-2xl font-mono tracking-[0.25em] uppercase text-white mb-16">
                    Platform Capabilities
                </h2>

                <div className="grid md:grid-cols-3 gap-8">

                    {/* Simulation Engine Card */}
                    <div className="aspect-square bg-black border border-white/10 p-8 flex flex-col justify-between transition-all duration-300 hover:border-white/20 hover:bg-neutral-950 group">
                        {/* Top Technical Labels */}
                        <div className="flex items-center justify-between text-[10px] font-mono tracking-[0.2em] text-white/40">
                            <span>6-DOF</span>
                        </div>

                        {/* Center Visual — Wireframe Cube */}
                        <div className="flex-1 flex items-center justify-center">
                            <svg viewBox="0 0 80 80" className="w-20 h-20 text-white/10 group-hover:text-white/20 transition-colors duration-500">
                                <rect x="20" y="20" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="1" />
                                <line x1="20" y1="20" x2="32" y2="10" stroke="currentColor" strokeWidth="0.5" />
                                <line x1="60" y1="20" x2="72" y2="10" stroke="currentColor" strokeWidth="0.5" />
                                <line x1="60" y1="60" x2="72" y2="50" stroke="currentColor" strokeWidth="0.5" />
                                <rect x="32" y="10" width="40" height="40" fill="none" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                            </svg>
                        </div>

                        {/* Bottom Content */}
                        <div>
                            <div className="text-[9px] font-mono tracking-[0.15em] text-white/25 mb-2">SIM RATE: 120Hz</div>
                            <h3 className="text-sm font-mono tracking-[0.2em] uppercase text-white">Simulation Engine</h3>
                            <p className="text-sm text-white/50 leading-relaxed mt-3">
                                High fidelity 6-DOF dynamics modeling with configurable control laws and environmental factors.
                            </p>
                        </div>
                    </div>

                    {/* Control Systems Card */}
                    <div className="aspect-square bg-black border border-white/10 p-8 flex flex-col justify-between transition-all duration-300 hover:border-white/20 hover:bg-neutral-950 group">
                        {/* Top Technical Labels */}
                        <div className="flex items-center justify-between text-[10px] font-mono tracking-[0.2em] text-white/40">
                            <span>PID / LQR</span>
                        </div>

                        {/* Center Visual — Block Diagram */}
                        <div className="flex-1 flex items-center justify-center">
                            <svg viewBox="0 0 120 60" className="w-28 h-auto text-white/10 group-hover:text-white/20 transition-colors duration-500">
                                {/* Summing junction */}
                                <circle cx="15" cy="30" r="6" fill="none" stroke="currentColor" strokeWidth="1" />
                                <line x1="13" y1="30" x2="17" y2="30" stroke="currentColor" strokeWidth="0.8" />
                                <line x1="15" y1="28" x2="15" y2="32" stroke="currentColor" strokeWidth="0.8" />
                                {/* Controller */}
                                <rect x="30" y="20" width="24" height="20" fill="none" stroke="currentColor" strokeWidth="1" />
                                <text x="42" y="34" textAnchor="middle" fontSize="6" fill="currentColor" fontFamily="monospace">K(s)</text>
                                {/* Plant */}
                                <rect x="68" y="20" width="24" height="20" fill="none" stroke="currentColor" strokeWidth="1" />
                                <text x="80" y="34" textAnchor="middle" fontSize="6" fill="currentColor" fontFamily="monospace">G(s)</text>
                                {/* Arrows */}
                                <line x1="3" y1="30" x2="9" y2="30" stroke="currentColor" strokeWidth="0.8" />
                                <line x1="21" y1="30" x2="30" y2="30" stroke="currentColor" strokeWidth="0.8" />
                                <line x1="54" y1="30" x2="68" y2="30" stroke="currentColor" strokeWidth="0.8" />
                                <line x1="92" y1="30" x2="115" y2="30" stroke="currentColor" strokeWidth="0.8" />
                                {/* Feedback */}
                                <line x1="100" y1="30" x2="100" y2="52" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                                <line x1="100" y1="52" x2="15" y2="52" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                                <line x1="15" y1="52" x2="15" y2="36" stroke="currentColor" strokeWidth="0.5" strokeDasharray="2 2" />
                            </svg>
                        </div>

                        {/* Bottom Content */}
                        <div>
                            <div className="text-[9px] font-mono tracking-[0.15em] text-white/25 mb-2">GAIN MARGIN: 12.4 dB</div>
                            <h3 className="text-sm font-mono tracking-[0.2em] uppercase text-white">Control Systems</h3>
                            <p className="text-sm text-white/50 leading-relaxed mt-3">
                                LQR, PID, adaptive control, and state feedback experimentation for stability augmentation.
                            </p>
                        </div>
                    </div>

                    {/* Estimation Suite Card */}
                    <div className="aspect-square bg-black border border-white/10 p-8 flex flex-col justify-between transition-all duration-300 hover:border-white/20 hover:bg-neutral-950 group">
                        {/* Top Technical Labels */}
                        <div className="flex items-center justify-between text-[10px] font-mono tracking-[0.2em] text-white/40">
                            <span>EKF / UKF</span>
                        </div>

                        {/* Center Visual — Covariance Matrix Grid */}
                        <div className="flex-1 flex items-center justify-center">
                            <div className="grid grid-cols-4 gap-px text-white/10 group-hover:text-white/20 transition-colors duration-500">
                                {[0.92, 0.03, 0.01, 0.00,
                                    0.03, 0.87, 0.04, 0.01,
                                    0.01, 0.04, 0.95, 0.02,
                                    0.00, 0.01, 0.02, 0.91].map((v, i) => (
                                        <div key={i} className={`w-8 h-8 flex items-center justify-center text-[8px] font-mono border border-current ${i % 5 === 0 ? 'text-white/25 group-hover:text-white/40' : ''}`}>
                                            {v.toFixed(2)}
                                        </div>
                                    ))}
                            </div>
                        </div>

                        {/* Bottom Content */}
                        <div>
                            <div className="text-[9px] font-mono tracking-[0.15em] text-white/25 mb-2">RESIDUAL: 0.003 rad</div>
                            <h3 className="text-sm font-mono tracking-[0.2em] uppercase text-white">Estimation Suite</h3>
                            <p className="text-sm text-white/50 leading-relaxed mt-3">
                                EKF, UKF and sensor fusion modules for precise attitude determination and state estimation.
                            </p>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    );
}

