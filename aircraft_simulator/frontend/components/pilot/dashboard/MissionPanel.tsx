"use client";

const MissionPanel = () => {
    const missions = [
        { id: 'MSN-001', name: 'Orbital Insertion', status: 'ACTIVE', progress: 65 },
        { id: 'MSN-002', name: 'Station Keeping', status: 'QUEUED', progress: 0 },
        { id: 'MSN-003', name: 'De-orbit Burn', status: 'SCHEDULED', progress: 0 },
    ];

    return (
        <div className="hud-panel animate-slide-in-left">
            <div className="flex items-center gap-2 mb-4">
                <span className="text-[10px] font-mono tracking-[0.2em] text-white/50 uppercase">Mission Profile</span>
            </div>

            <div className="space-y-6">
                {missions.map((mission) => (
                    <div key={mission.id} className="space-y-3">
                        <div className="flex justify-between items-center">
                            <div>
                                <span className="block text-[8px] font-mono text-white/20 uppercase tracking-widest">{mission.id}</span>
                                <span className="text-xs text-white/80 font-medium">{mission.name}</span>
                            </div>
                            <span className={`text-[9px] font-mono tracking-tighter uppercase ${mission.status === 'ACTIVE' ? 'text-accent' : 'text-white/20'}`}>
                                {mission.status}
                            </span>
                        </div>

                        <div className="relative h-1.5 bg-white/5 rounded-full overflow-hidden">
                            <div
                                className={`h-full transition-all duration-1000 ${mission.status === 'ACTIVE' ? 'bg-accent shadow-[0_0_10px_rgba(0,230,128,0.3)]' : 'bg-transparent'}`}
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
