"use client";

import { useMemo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, ReferenceArea } from 'recharts';
import { ConsistencyHistory } from '@/lib/simulation/estimation/ConsistencyMetrics';
import { Activity, TrendingUp } from 'lucide-react';

interface NEESPlotProps {
    history: ConsistencyHistory;
}

export function NEESPlot({ history }: NEESPlotProps) {
    const data = useMemo(() => {
        return history.time.map((t, i) => ({
            time: t.toFixed(1),
            nees: history.nees[i],
            upper: history.neesUpperBound,
            lower: history.neesLowerBound
        }));
    }, [history]);

    const consistency = useMemo(() => {
        if (history.nees.length === 0) return 100;
        const inBounds = history.nees.filter(
            n => n >= history.neesLowerBound && n <= history.neesUpperBound
        ).length;
        return Math.round((inBounds / history.nees.length) * 100);
    }, [history]);

    const isConsistent = consistency >= 90;

    return (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 h-full">
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">NEES</h3>
                    <span className="text-[10px] text-slate-500 font-mono">Normalized Estimation Error Squared</span>
                </div>
                <div className={`text-[10px] font-bold px-2 py-0.5 rounded border uppercase ${isConsistent
                        ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                        : "bg-rose-500/10 text-rose-500 border-rose-500/20"
                    }`}>
                    {consistency}% In Bounds
                </div>
            </div>

            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="time" stroke="#666" fontSize={10} />
                        <YAxis stroke="#666" fontSize={10} domain={[0, 'auto']} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: 11 }}
                            labelStyle={{ color: '#888' }}
                        />
                        <ReferenceLine y={history.neesUpperBound} stroke="#ef4444" strokeDasharray="5 5" label={{ value: '95%', fill: '#ef4444', fontSize: 10 }} />
                        <ReferenceLine y={history.neesLowerBound} stroke="#ef4444" strokeDasharray="5 5" />
                        <ReferenceArea y1={history.neesLowerBound} y2={history.neesUpperBound} fill="#22c55e" fillOpacity={0.1} />
                        <Line type="monotone" dataKey="nees" stroke="#4ade80" strokeWidth={2} dot={false} name="NEES" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-slate-500 mt-2">
                χ²({history.nees.length > 0 ? 'n' : '?'}) bounds: [{history.neesLowerBound.toFixed(1)}, {history.neesUpperBound.toFixed(1)}]
            </p>
        </div>
    );
}

interface NISPlotProps {
    history: ConsistencyHistory;
}

export function NISPlot({ history }: NISPlotProps) {
    const data = useMemo(() => {
        return history.time.map((t, i) => ({
            time: t.toFixed(1),
            nis: history.nis[i],
            upper: history.nisUpperBound,
            lower: history.nisLowerBound
        }));
    }, [history]);

    return (
        <div className="bg-slate-900/60 backdrop-blur-md border border-slate-700/50 rounded-xl p-5 h-full">
            <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="w-4 h-4 text-blue-400" />
                <h3 className="text-sm font-bold uppercase tracking-wider text-slate-100">NIS</h3>
                <span className="text-[10px] text-slate-500 font-mono">Normalized Innovation Squared</span>
            </div>

            <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                        <XAxis dataKey="time" stroke="#666" fontSize={10} />
                        <YAxis stroke="#666" fontSize={10} domain={[0, 'auto']} />
                        <Tooltip
                            contentStyle={{ backgroundColor: '#111', borderColor: '#333', fontSize: 11 }}
                            labelStyle={{ color: '#888' }}
                        />
                        <ReferenceLine y={history.nisUpperBound} stroke="#f59e0b" strokeDasharray="5 5" />
                        <ReferenceLine y={history.nisLowerBound} stroke="#f59e0b" strokeDasharray="5 5" />
                        <ReferenceArea y1={history.nisLowerBound} y2={history.nisUpperBound} fill="#3b82f6" fillOpacity={0.1} />
                        <Line type="monotone" dataKey="nis" stroke="#60a5fa" strokeWidth={2} dot={false} name="NIS" />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <p className="text-[10px] text-slate-500 mt-2">
                χ²({history.nis.length > 0 ? 'm' : '?'}) bounds: [{history.nisLowerBound.toFixed(1)}, {history.nisUpperBound.toFixed(1)}]
            </p>
        </div>
    );
}
