"use client";

export function BarPlot({ title, values }: { title: string; values: { label: string; value: number }[] }) {
    const max = Math.max(1, ...values.map((item) => item.value));
    return (
        <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
            <div className="text-[10px] uppercase text-white/40 mb-3">{title}</div>
            <div className="space-y-3">
                {values.map((item) => (
                    <div key={item.label}>
                        <div className="flex justify-between text-[10px] font-mono text-white/60 mb-1">
                            <span>{item.label}</span>
                            <span>{item.value.toFixed(3)}</span>
                        </div>
                        <div className="h-2 bg-white/5">
                            <div className="h-2 bg-sky-400" style={{ width: `${(item.value / max) * 100}%` }} />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
