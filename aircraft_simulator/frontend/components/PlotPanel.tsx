"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

interface Props {
    data: any[];
    dataKey: string;
    label: string;
}

export function PlotPanel({ data, dataKey, label }: Props) {
    return (
        <div className="border border-neutral-800 rounded-md p-4 h-64">
            <h4 className="text-sm mb-2">{label}</h4>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data}>
                    <XAxis dataKey="t" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey={dataKey} strokeWidth={2} />
                </LineChart>
            </ResponsiveContainer>
        </div>
    );
}
