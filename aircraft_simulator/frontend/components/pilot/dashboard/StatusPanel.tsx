"use client";

import { useSimulationStore } from '@/stores/useSimulationStore';

const StatusPanel = () => {
    const services = [
        { name: 'ADCS Core', status: 'ONLINE', color: 'bg-accent' },
        { name: 'Gyroscope', status: 'ONLINE', color: 'bg-accent' },
        { name: 'Magnetometer', status: 'ONLINE', color: 'bg-accent' },
        { name: 'Star Tracker', status: 'WARNING', color: 'bg-yellow-500' },
        { name: 'Reaction Wheels', status: 'ONLINE', color: 'bg-accent' },
    ];

    return (
        <div className="bg-black/30 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)] animate-slide-in-left z-20">
            <div className="flex items-center gap-2 mb-6">
                <span className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase">System Status</span>
            </div>

            <div className="space-y-5">
                {services.map((service) => (
                    <div key={service.name} className="flex justify-between items-center group">
                        <span className="text-[11px] text-white/50 uppercase tracking-[0.2em] font-mono group-hover:text-white/80 transition-colors">{service.name}</span>
                        <div className="flex items-center gap-3">
                            <span className={`text-[9px] font-mono ${service.status === 'ONLINE' ? 'text-accent/70' : 'text-yellow-500/70'} tracking-tighter uppercase`}>
                                {service.status}
                            </span>
                            <div className={`w-1.5 h-1.5 rounded-full ${service.color} ${service.status === 'ONLINE' ? 'shadow-[0_0_8px_rgba(0,230,128,0.4)]' : ''} opacity-80`} />
                        </div>
                    </div>
                ))}
            </div>

            <div className="mt-12 flex justify-between items-center border-t border-white/5 pt-4">
                <span className="text-[9px] text-white/10 uppercase tracking-widest font-mono">Uptime</span>
                <span className="text-[11px] text-white/30 font-mono tracking-widest uppercase italic">12:34:56</span>
            </div>
        </div>
    );
};

export default StatusPanel;
