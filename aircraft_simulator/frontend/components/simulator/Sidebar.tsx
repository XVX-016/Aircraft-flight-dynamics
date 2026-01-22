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
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col h-full">
            <div className="p-6 border-b border-slate-800">
                <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-primary rounded flex items-center justify-center">
                        <Plane className="text-white w-5 h-5" />
                    </div>
                    <div>
                        <h2 className="text-sm font-bold text-white tracking-tight">ADCS-SIM</h2>
                        <p className="text-[10px] text-slate-500 font-mono uppercase">Phase 4 Active</p>
                    </div>
                </div>
            </div>

            <nav className="flex-1 px-4 py-6 space-y-2">
                {navItems.map((item) => (
                    <button
                        key={item.label}
                        className={clsx(
                            "w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors text-sm",
                            item.active
                                ? "bg-primary/10 text-primary border border-primary/20"
                                : "text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                        )}
                    >
                        <item.icon className="w-4 h-4" />
                        <span className="font-medium text-[13px]">{item.label}</span>
                    </button>
                ))}
            </nav>

            <div className="p-4 border-t border-slate-800">
                <div className="bg-slate-950 rounded-lg p-3 border border-slate-800">
                    <div className="flex items-center space-x-2 mb-2">
                        <div className="w-2 h-2 bg-success rounded-full" />
                        <span className="text-[10px] text-slate-400 font-mono">CONNECTION STABLE</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-mono truncate">ID: 0xFD4-EST-2245</p>
                </div>
            </div>
        </aside>
    );
}
