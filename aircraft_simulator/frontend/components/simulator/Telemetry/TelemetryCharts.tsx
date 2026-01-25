'use client';

import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';
import { Card } from '@/components/ui/Card';

const dummyData = Array.from({ length: 20 }, (_, i) => ({
    time: i,
    altitude: 3000 + Math.random() * 50,
    speed: 250 + Math.sin(i * 0.5) * 10,
}));

export function TelemetryCharts() {
    return (
        <div className="space-y-6">
            <Card title="Flight Metrics (Altitude & Speed)">
                <div className="h-56 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dummyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                            <XAxis
                                dataKey="time"
                                stroke="#475569"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontFamily: 'var(--font-mono)' }}
                            />
                            <YAxis
                                stroke="#475569"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                                tick={{ fontFamily: 'var(--font-mono)' }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: '#0f172a',
                                    borderColor: '#334155',
                                    color: '#f8fafc',
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '10px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255,255,255,0.1)'
                                }}
                            />
                            <Legend
                                verticalAlign="top"
                                align="right"
                                height={36}
                                wrapperStyle={{
                                    fontFamily: 'var(--font-mono)',
                                    fontSize: '10px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.1em'
                                }}
                            />
                            <Line
                                type="monotone"
                                dataKey="altitude"
                                stroke="#6366F1"
                                strokeWidth={2}
                                dot={false}
                                name="ALT (FT)"
                            />
                            <Line
                                type="monotone"
                                dataKey="speed"
                                stroke="#10B981"
                                strokeWidth={2}
                                dot={false}
                                name="VEL (KTS)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card title="State Estimation Output">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">EKF Sync</p>
                        <p className="text-xl font-bold text-success font-mono">NOMINAL</p>
                    </div>
                    <div className="text-right">
                        <p className="text-[10px] text-slate-500 font-mono tracking-widest uppercase">Innovation RMSE</p>
                        <p className="text-sm font-mono text-slate-300 font-bold">0.024</p>
                    </div>
                </div>
                <div className="mt-4 h-1.5 w-full bg-slate-800/50 rounded-full overflow-hidden border border-slate-700/30">
                    <div className="h-full bg-success w-[92%] shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                </div>
            </Card>
        </div>
    );
}
