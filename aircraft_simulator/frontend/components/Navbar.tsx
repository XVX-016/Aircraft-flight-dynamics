import Link from "next/link";
import { Plane } from "lucide-react";

export function Navbar() {
    return (
        <nav className="flex items-center justify-between border-b border-slate-800 bg-slate-950/80 backdrop-blur-md px-12 py-5 sticky top-0 z-50">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-indigo-500 rounded flex items-center justify-center">
                    <Plane className="text-white w-5 h-5" strokeWidth={1.5} />
                </div>
                <span className="font-bold tracking-tight text-white uppercase text-sm">
                    ADCS Simulation Platform
                </span>
            </div>
            <div className="flex gap-8 text-[13px] font-medium text-slate-400">
                <Link href="/" className="hover:text-indigo-400 transition-colors">Home</Link>
                <Link href="/simulator" className="hover:text-indigo-400 transition-colors">Simulator</Link>
                <Link href="/control" className="hover:text-indigo-400 transition-colors">LQR Control</Link>
                <Link href="/estimation" className="hover:text-indigo-400 transition-colors">EKF Estimation</Link>
                <Link href="/validation" className="hover:text-indigo-400 transition-colors uppercase tracking-widest text-xs py-0.5 px-3 bg-indigo-500/10 border border-indigo-500/20 rounded">Validation</Link>
            </div>
        </nav>
    );
}
