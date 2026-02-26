"use client";

type Eigen = { real: number; imag: number };

export function SpectralPlot({ openLoop, closedLoop, title }: { openLoop: Eigen[]; closedLoop?: Eigen[]; title: string }) {
    const hasOpen = openLoop && openLoop.length > 0;
    const hasClosed = closedLoop && closedLoop.length > 0;
    if (!hasOpen && !hasClosed) {
        return (
            <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg text-xs font-mono text-white/50">
                Spectral plot unavailable.
            </div>
        );
    }

    const all = [...(openLoop ?? []), ...(closedLoop ?? [])];
    const xVals = all.map((v) => v.real);
    const yVals = all.map((v) => v.imag);
    const xMin = Math.min(...xVals, -0.1);
    const xMax = Math.max(...xVals, 0.1);
    const yMin = Math.min(...yVals, -0.1);
    const yMax = Math.max(...yVals, 0.1);
    const padX = (xMax - xMin || 1) * 0.1;
    const padY = (yMax - yMin || 1) * 0.1;
    const xmin = xMin - padX;
    const xmax = xMax + padX;
    const ymin = yMin - padY;
    const ymax = yMax + padY;

    const W = 560;
    const H = 300;
    const xScale = (x: number) => ((x - xmin) / (xmax - xmin)) * W;
    const yScale = (y: number) => H - ((y - ymin) / (ymax - ymin)) * H;
    const y0 = yScale(0);
    const x0 = xScale(0);

    return (
        <div className="hud-panel p-4 border border-white/10 bg-white/[0.02] rounded-lg">
            <div className="text-[10px] uppercase text-white/40 mb-3">{title}</div>
            <div className="w-full overflow-x-auto">
                <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} className="bg-black/30 border border-white/10 rounded">
                    <line x1={0} x2={W} y1={y0} y2={y0} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
                    <line x1={x0} x2={x0} y1={0} y2={H} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />
                    {(openLoop ?? []).map((p, i) => (
                        <circle key={`ol-${i}`} cx={xScale(p.real)} cy={yScale(p.imag)} r={4} fill="#60a5fa" />
                    ))}
                    {(closedLoop ?? []).map((p, i) => (
                        <circle key={`cl-${i}`} cx={xScale(p.real)} cy={yScale(p.imag)} r={4} fill="#f87171" />
                    ))}
                </svg>
            </div>
            <div className="mt-2 text-[10px] font-mono text-white/40">
                {closedLoop && closedLoop.length > 0
                    ? "Blue: open-loop, Red: closed-loop"
                    : "Point color indicates eigenvalue location in complex plane."}
            </div>
        </div>
    );
}
