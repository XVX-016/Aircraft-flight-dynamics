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

type ModalAnalysis = {
    spectral_margin: number;
    min_damping_ratio: number | null;
    unstable_modes: number;
    neutral_modes: number;
    modes: ModeInfo[];
};

function fmt(v: number | null | undefined, digits = 3) {
    if (v === null || v === undefined || !Number.isFinite(v)) return "--";
    return v.toFixed(digits);
}

function titleCase(s: string) {
    return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function StabilityOverview({ modal }: { modal?: ModalAnalysis }) {
    if (!modal) {
        return (
            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg text-xs font-mono text-white/50">
                Stability overview unavailable. Run backend linearization.
            </div>
        );
    }

    const openLoopStable = modal.unstable_modes === 0;
    const dominant = [...modal.modes].sort((a, b) => b.eigenvalue_real - a.eigenvalue_real)[0];
    const weakDamping = modal.min_damping_ratio !== null && modal.min_damping_ratio < 0.1;

    return (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                <div className="text-[10px] uppercase text-white/40 mb-1">Open-Loop Stability</div>
                <div className={`text-sm font-mono ${openLoopStable ? "text-emerald-300" : "text-amber-300"}`}>
                    {openLoopStable ? "Stable" : "Unstable"}
                </div>
            </div>
            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                <div className="text-[10px] uppercase text-white/40 mb-1">Spectral Margin</div>
                <div className="text-sm font-mono text-white">{fmt(modal.spectral_margin, 4)}</div>
            </div>
            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                <div className="text-[10px] uppercase text-white/40 mb-1">Min Damping Ratio</div>
                <div className={`text-sm font-mono ${weakDamping ? "text-amber-300" : "text-white"}`}>
                    {fmt(modal.min_damping_ratio, 3)}
                </div>
            </div>
            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
                <div className="text-[10px] uppercase text-white/40 mb-1">Dominant Mode</div>
                <div className="text-sm font-mono text-white">
                    {dominant ? titleCase(dominant.type) : "--"}
                </div>
            </div>
        </div>
    );
}

