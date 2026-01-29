"use client";

import { useSimulationStore } from "@/stores/useSimulationStore";
import { validateState } from "@/lib/simulation/ValidationSystem";
import { ShieldCheck, ShieldAlert, AlertTriangle, FileText } from "lucide-react";
import { useMemo } from "react";

export default function CertificationPanel() {
    const { orientation, velocity, altitude } = useSimulationStore();

    const v = useMemo(() => validateState(orientation, velocity, altitude), [orientation, velocity, altitude]);

    return (
        <div className="absolute bottom-8 left-8 w-80 bg-slate-900/60 backdrop-blur-md border border-slate-800 rounded-xl p-5 shadow-2xl">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    {v.isValid ? (
                        <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    ) : (
                        <ShieldAlert className="w-5 h-5 text-rose-500" />
                    )}
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100">
                        System Airworthiness
                    </h3>
                </div>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${v.isValid ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    }`}>
                    {v.isValid ? "Valid" : "Violated"}
                </div>
            </div>

            <div className="space-y-3">
                {v.errors.map((error, i) => (
                    <div key={i} className="flex gap-2 p-2 bg-rose-500/10 border border-rose-500/20 rounded-lg">
                        <AlertTriangle className="w-3 h-3 text-rose-500 shrink-0 mt-0.5" />
                        <span className="text-[10px] text-rose-200 leading-tight">{error}</span>
                    </div>
                ))}

                {v.warnings.map((warning, i) => (
                    <div key={i} className="flex gap-2 p-2 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                        <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />
                        <span className="text-[10px] text-amber-200 leading-tight">{warning}</span>
                    </div>
                ))}

                {v.isValid && v.warnings.length === 0 && (
                    <p className="text-[10px] text-emerald-400/60 italic text-center py-2">
                        All engineering constraints within nominal bounds.
                    </p>
                )}
            </div>

            <button className="w-full mt-4 flex items-center justify-center gap-2 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold uppercase tracking-widest rounded-lg border border-slate-700 transition-colors">
                <FileText className="w-3 h-3" />
                Generate Cert Report
            </button>
        </div>
    );
}
