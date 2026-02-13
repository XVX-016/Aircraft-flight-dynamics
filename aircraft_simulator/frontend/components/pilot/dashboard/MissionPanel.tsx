"use client";

const MissionPanel = () => {
    const missions = [
        { id: 'MSN-001', name: 'Orbital Insertion', status: 'ACTIVE', progress: 65 },
        { id: 'MSN-002', name: 'Station Keeping', status: 'QUEUED', progress: 0 },
        { id: 'MSN-003', name: 'De-orbit Burn', status: 'SCHEDULED', progress: 0 },
    ];

    return (
        <div className="bg-black/30 backdrop-blur-xl border border-white/5 rounded-2xl p-6 shadow-[0_0_40px_rgba(0,0,0,0.4)] animate-slide-in-left z-20">
            <div className="flex items-center gap-2 mb-6">
                <span className="text-[10px] font-mono tracking-[0.3em] text-white/40 uppercase">Mission Profile</span>
            </div>

            <div className="space-y-7">
                {missions.map((mission) => (
                    <div key={mission.id} className="space-y-4">
                        <div className="flex justify-between items-end">
                            <div>
                                <span className="block text-[8px] font-mono text-white/10 uppercase tracking-[0.4em] mb-1">{mission.id}</span>
                                <span className="text-[11px] text-white/70 font-medium tracking-wider uppercase italic">{mission.name}</span>
                            </div>
                            <span className={`text-[9px] font-mono tracking-[0.1em] uppercase ${mission.status === 'ACTIVE' ? 'text-accent/60' : 'text-white/10'}`}>
                                {mission.status}
                            </span>
                        </div>

                        <div className="relative h-[2px] bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${mission.status === 'ACTIVE' ? 'bg-accent/40 shadow-[0_0_8px_rgba(0,230,128,0.2)]' : 'bg-transparent'}`}
                                style={{ width: `${mission.progress}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default MissionPanel;
