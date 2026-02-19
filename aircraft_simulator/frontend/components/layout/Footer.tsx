import Link from "next/link";

export function Footer() {
    return (
        <footer className="border-t border-white/10 bg-black py-12">
            <div className="mx-auto grid max-w-[1400px] gap-12 px-8 text-sm md:grid-cols-4">
                <div className="space-y-4">
                    <h3 className="text-sm font-semibold uppercase tracking-[0.25em] text-white">ADCS-SIM</h3>
                    <p className="text-xs leading-relaxed text-white/50">
                        Advanced Attitude Determination and Control Simulation Platform for aerospace research, control
                        design, and flight validation.
                    </p>
                </div>

                <div>
                    <h4 className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Platform</h4>
                    <ul className="space-y-3 text-xs tracking-wide text-white/50">
                        <li>
                            <Link href="/hangar" className="hover:text-white">
                                Hangar
                            </Link>
                        </li>
                        <li>
                            <Link href="/control" className="hover:text-white">
                                Control Systems
                            </Link>
                        </li>
                        <li>
                            <Link href="/estimation" className="hover:text-white">
                                Estimation Suite
                            </Link>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Resources</h4>
                    <ul className="space-y-3 text-xs tracking-wide text-white/50">
                        <li>
                            <a href="https://github.com/XVX-016/Aircraft-flight-dynamics" target="_blank" rel="noopener noreferrer" className="hover:text-white">
                                GitHub Repository
                            </a>
                        </li>
                        <li>
                            <span className="cursor-not-allowed opacity-50">Documentation</span>
                        </li>
                        <li>
                            <span className="cursor-not-allowed opacity-50">API Roadmap</span>
                        </li>
                    </ul>
                </div>

                <div>
                    <h4 className="mb-6 text-[10px] font-bold uppercase tracking-[0.2em] text-white/60">Contact</h4>
                    <ul className="space-y-3 text-xs tracking-wide text-white/50">
                        <li>research@adcs-sim.com</li>
                        <li>Collaboration Inquiries</li>
                    </ul>
                </div>
            </div>

            <div className="mx-auto mt-12 flex max-w-[1400px] justify-between border-t border-white/5 px-8 pt-8 text-[10px] uppercase tracking-wider text-white/30">
                <span>(c) 2026 ADCS-SIM. All rights reserved.</span>
                <span>Built for Aerospace Simulation &amp; Control Research</span>
            </div>
        </footer>
    );
}
