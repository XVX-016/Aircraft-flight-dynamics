"use client";

import { useSim } from "@/lib/providers/SimProvider";

const MissionPanel = () => {
    const { time } = useSim();
    const missionProgress = Math.min(100, (time / 120) * 100);
    const phase2 = Math.max(0, Math.min(100, (time - 40) / 80 * 100));
    const phase3 = Math.max(0, Math.min(100, (time - 90) / 60 * 100));

    const missions = [
        { id: 'FL-001', name: 'Climb & Stabilize', status: missionProgress < 100 ? 'ACTIVE' : 'COMPLETE', progress: missionProgress },
        { id: 'FL-002', name: 'Cruise Hold', status: phase2 <= 0 ? 'QUEUED' : phase2 < 100 ? 'ACTIVE' : 'COMPLETE', progress: phase2 },
        { id: 'FL-003', name: 'Approach Prep', status: phase3 <= 0 ? 'SCHEDULED' : phase3 < 100 ? 'ACTIVE' : 'COMPLETE', progress: phase3 },
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
