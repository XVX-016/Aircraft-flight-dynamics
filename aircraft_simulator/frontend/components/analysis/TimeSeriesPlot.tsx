"use client";

type Series = { label: string; values: number[]; color: string };

function bounds(values: number[]) {
    if (values.length === 0) return { min: -1, max: 1 };
    const min = Math.min(...values);
    const max = Math.max(...values);
    if (Math.abs(max - min) < 1e-9) return { min: min - 1, max: max + 1 };
    return { min, max };
}

export function TimeSeriesPlot({ title, x, series }: { title: string; x: number[]; series: Series[] }) {
    if (!x.length || !series.length) {
        return <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg text-xs font-mono text-white/50">Plot unavailable.</div>;
    }
    const width = 720;
    const height = 280;
    const allValues = series.flatMap((item) => item.values);
    const yBounds = bounds(allValues);
    const xMin = x[0];
    const xMax = x[x.length - 1] || 1;
    const sx = (value: number) => 40 + ((value - xMin) / Math.max(1e-9, xMax - xMin)) * (width - 60);
    const sy = (value: number) => height - 30 - ((value - yBounds.min) / Math.max(1e-9, yBounds.max - yBounds.min)) * (height - 50);
    return (
        <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg overflow-x-auto">
            <div className="text-[10px] uppercase text-white/40 mb-3">{title}</div>
            <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className="bg-black/30 border border-white/10 rounded">
                <line x1={40} x2={40} y1={10} y2={height - 30} stroke="rgba(255,255,255,0.2)" />
                <line x1={40} x2={width - 20} y1={height - 30} y2={height - 30} stroke="rgba(255,255,255,0.2)" />
                {series.map((item) => {
                    const path = item.values.map((value, index) => `${index === 0 ? "M" : "L"} ${sx(x[index])} ${sy(value)}`).join(" ");
                    return <path key={item.label} d={path} fill="none" stroke={item.color} strokeWidth={2} />;
                })}
            </svg>
            <div className="mt-3 flex flex-wrap gap-4 text-[10px] font-mono text-white/60">
                {series.map((item) => (
                    <div key={item.label} className="flex items-center gap-2">
                        <span className="inline-block h-2 w-2" style={{ backgroundColor: item.color }} />
                        {item.label}
                    </div>
                ))}
            </div>
        </div>
    );
}
