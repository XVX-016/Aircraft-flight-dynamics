import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black mt-32 py-16">
            <div className="max-w-[1400px] mx-auto px-8 grid md:grid-cols-4 gap-12 text-sm">

                {/* Brand + Mission */}
                <div className="space-y-4">
                    <h3 className="text-sm tracking-[0.25em] font-semibold uppercase text-white">
                        ADCS-SIM
                    </h3>
                    <p className="text-white/50 leading-relaxed text-xs">
                        Advanced Attitude Determination and Control Simulation Platform
                        for aerospace research, control design, and flight validation.
                    </p>
                </div>

                {/* Platform */}
                <div>
                    <h4 className="uppercase tracking-[0.2em] text-white/60 mb-6 text-[10px] font-bold">
                        Platform
                    </h4>
                    <ul className="space-y-3 text-white/50 text-xs tracking-wide">
                        <li><Link href="/hangar" className="hover:text-white transition-colors">Hangar</Link></li>
                        <li><Link href="/control" className="hover:text-white transition-colors">Control Systems</Link></li>
                        <li><Link href="/estimation" className="hover:text-white transition-colors">Estimation Suite</Link></li>
                    </ul>
                </div>

                {/* Resources */}
                <div>
                    <h4 className="uppercase tracking-[0.2em] text-white/60 mb-6 text-[10px] font-bold">
                        Resources
                    </h4>
                    <ul className="space-y-3 text-white/50 text-xs tracking-wide">
                        <li>
                            <a href="https://github.com/XVX-016/Aircraft-flight-dynamics" target="_blank" rel="noopener noreferrer" className="hover:text-white transition-colors">
                                GitHub Repository
                            </a>
                        </li>
                        <li><span className="cursor-not-allowed opacity-50">Documentation</span></li>
                        <li><span className="cursor-not-allowed opacity-50">API Roadmap</span></li>
                    </ul>
                </div>

                {/* Contact */}
                <div>
                    <h4 className="uppercase tracking-[0.2em] text-white/60 mb-6 text-[10px] font-bold">
                        Contact
                    </h4>
                    <ul className="space-y-3 text-white/50 text-xs tracking-wide">
                        <li>research@adcs-sim.com</li>
                        <li>Collaboration Inquiries</li>
                    </ul>
                </div>

            </div>

            <div className="max-w-[1400px] mx-auto px-8 mt-16 pt-8 border-t border-white/5 text-[10px] text-white/30 flex justify-between uppercase tracking-wider">
                <span>© 2026 ADCS-SIM. All rights reserved.</span>
                <span>Built for Aerospace Simulation & Control Research</span>
            </div>
        </footer>
    );
}
