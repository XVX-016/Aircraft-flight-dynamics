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
        <div className="space-y-4">
            <Card title="Flight Metrics (Altitude & Speed)">
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dummyData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#334155" vertical={false} />
                            <XAxis
                                dataKey="time"
                                stroke="#64748b"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <YAxis
                                stroke="#64748b"
                                fontSize={10}
                                tickLine={false}
                                axisLine={false}
                            />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1e293b', borderColor: '#334155', color: '#f8fafc' }}
                                itemStyle={{ color: '#3b82f6' }}
                            />
                            <Legend verticalAlign="top" height={36} />
                            <Line
                                type="monotone"
                                dataKey="altitude"
                                stroke="#3B82F6"
                                strokeWidth={2}
                                dot={false}
                                name="Alt (ft)"
                            />
                            <Line
                                type="monotone"
                                dataKey="speed"
                                stroke="#10B981"
                                strokeWidth={2}
                                dot={false}
                                name="Vel (kts)"
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </Card>

            <Card title="EKF Status">
                <div className="flex items-center justify-between">
                    <div className="space-y-1">
                        <p className="text-xs text-slate-400 font-mono">Convergence</p>
                        <p className="text-lg font-bold text-success font-mono">NOMINAL</p>
                    </div>
                    <div className="w-16 h-16 rounded-full border-4 border-slate-700 flex items-center justify-center">
                        <span className="text-[10px] font-mono text-slate-500">RMSE: 0.2</span>
                    </div>
                </div>
            </Card>
        </div>
    );
}
