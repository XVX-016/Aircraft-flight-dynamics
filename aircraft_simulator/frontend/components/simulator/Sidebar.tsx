'use client';

import {
    LayoutDashboard,
    Plane,
    Settings,
    Activity,
    FileText,
    Cpu,
    Target
} from 'lucide-react';
import { clsx } from 'clsx';

const navItems = [
    { label: 'Simulations', icon: LayoutDashboard, active: true },
    { label: 'Aircraft Library', icon: Plane },
    { label: 'Control Design', icon: Target },
    { label: 'State Estimation', icon: Cpu },
    { label: 'Reports', icon: FileText },
    { label: 'System Health', icon: Activity },
    { label: 'Settings', icon: Settings },
];

export function Sidebar() {
    return (
        <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col h-full shadow-2xl relative z-20">
            <div className="p-8 border-b border-slate-800/50">
                <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center border border-primary/30 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
                        <Plane className="text-primary w-6 h-6" strokeWidth={1.5} />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-slate-100 tracking-[0.1em] uppercase">ADCS-SIM</h2>
                        <p className="text-[10px] text-primary/70 font-mono font-bold tracking-widest">PHASE 4 ACTIVE</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 py-8 space-y-1.5">
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        className={clsx(
                            "w-full flex items-center space-x-3 px-4 py-2.5 rounded-xl transition-all duration-200 text-sm group",
                            item.active
                                ? "bg-primary/10 text-primary border border-primary/20 shadow-sm shadow-primary/5"
                                : "text-slate-500 hover:bg-slate-800/50 hover:text-slate-300 border border-transparent"
                        )}
                    >
                        <item.icon className={clsx(
                            "w-4 h-4 transition-colors",
                            item.active ? "text-primary" : "text-slate-500 group-hover:text-slate-400"
                        )} strokeWidth={1.5} />
                        <span className="font-semibold tracking-tight">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-6 border-t border-slate-800/50">
                <div className="glass rounded-xl p-4 border border-slate-700/30">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-success rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                        <span className="text-[10px] text-slate-400 font-mono font-bold tracking-widest">SAT-LINK STABLE</span>
                    </div>
                    <p className="text-[10px] text-slate-600 font-mono truncate">0xFD4-EST-2245-MOD-ALPHA</p>
                </div>
            </div>
        </aside>
    );
}
