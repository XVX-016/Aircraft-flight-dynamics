"use client";

type ModeInfo = {
    type: string;
    family: string;
    eigenvalue_real: number;
    eigenvalue_imag: number;
    wn: number | null;
    zeta: number | null;
    stable: boolean;
};

function fmt(v: number | null | undefined, digits = 3) {
    if (v === null || v === undefined || !Number.isFinite(v)) return "--";
    return v.toFixed(digits);
}

function titleCase(s: string) {
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function ModeTable({ modes }: { modes?: ModeInfo[] }) {
    if (!modes || modes.length === 0) {
        return (
            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg text-xs font-mono text-white/50">
                Mode table unavailable.
            </div>
        );
    }

    return (
        <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg overflow-x-auto">
            <div className="text-[10px] uppercase text-white/40 mb-3">Modal Summary</div>
            <table className="min-w-full text-xs font-mono">
                <thead>
                    <tr className="text-white/50 border-b border-white/10">
                        <th className="text-left py-2 pr-3">Mode</th>
                        <th className="text-right py-2 px-3">Re(&lambda;)</th>
                        <th className="text-right py-2 px-3">Im(&lambda;)</th>
                        <th className="text-right py-2 px-3">&zeta;</th>
                        <th className="text-right py-2 px-3">&omega;<sub>n</sub></th>
                        <th className="text-right py-2 pl-3">Stability</th>
                    </tr>
                </thead>
                <tbody>
                    {modes.map((m, idx) => {
                        const weak = m.zeta !== null && m.zeta < 0.1;
                        return (
                            <tr key={`${m.type}-${idx}`} className="border-b border-white/5 text-white/80">
                                <td className="py-2 pr-3">{titleCase(m.type)}</td>
                                <td className="py-2 px-3 text-right">{fmt(m.eigenvalue_real, 4)}</td>
                                <td className="py-2 px-3 text-right">{fmt(m.eigenvalue_imag, 4)}</td>
                                <td className={`py-2 px-3 text-right ${weak ? "text-amber-300" : ""}`}>{fmt(m.zeta, 3)}</td>
                                <td className="py-2 px-3 text-right">{fmt(m.wn, 3)}</td>
                                <td className={`py-2 pl-3 text-right ${m.stable ? "text-emerald-300" : "text-amber-300"}`}>
                                    {m.stable ? "Stable" : "Unstable"}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

