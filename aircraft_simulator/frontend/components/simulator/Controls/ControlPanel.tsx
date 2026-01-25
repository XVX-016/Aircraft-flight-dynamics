'use client';

import { Card } from '@/components/ui/Card';

export function ControlPanel() {
    const controls = [
        { label: 'Throttle', value: 75, color: 'bg-primary' },
        { label: 'Pitch', value: 0, color: 'bg-warning' },
        { label: 'Roll', value: 0, color: 'bg-warning' },
        { label: 'Yaw', value: 0, color: 'bg-warning' },
    ];

    return (
        <Card title="Manual Flight Controls">
            <div className="space-y-4">
                {controls.map((control) => (
                    <div key={control.label} className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-mono uppercase tracking-wider text-slate-400">
                            <span>{control.label}</span>
                            <span>{control.value}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden">
                            <div
                                className={`h-full ${control.color} transition-all duration-300`}
                                style={{ width: `${control.value > 0 ? control.value : 50}%` }}
                            />
                        </div>
                        <input
                            type="range"
                            className="w-full h-1 bg-transparent appearance-none cursor-pointer accent-primary"
                            defaultValue={control.value}
                        />
                    </div>
                ))}
            </div>
        </Card>
    );
}
