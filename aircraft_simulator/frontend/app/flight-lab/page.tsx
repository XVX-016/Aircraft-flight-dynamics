"use client";

import { useEffect } from 'react';
import PilotDeck from '@/components/pilot/PilotDeck';
import { toast } from 'sonner';
import { useSimulationStore } from '@/stores/useSimulationStore';

export default function FlightLabPage() {
    const setScene = useSimulationStore((state) => state.setScene);

    useEffect(() => {
        // When entering Flight Lab, set scene to Hangar or Takeoff as desired
        setScene('hangar'); // Or 'takeoff' depending on ensuring 3D view is active? 
        // Previous logic had 'hangar' on Launch.

        toast.success('System Initialized', {
            description: 'Entering Pilot Control Interface.',
            duration: 2000,
        });
    }, [setScene]);

    const handleInitialize = () => {
        toast.success('Simulation Active', {
            description: 'ADCS real-time link established.',
            duration: 3000,
        });
    };

    return (
        <div className="relative min-h-screen overflow-hidden">
            <PilotDeck onInitialize={handleInitialize} />

            {/* Corner decorations */}
            <div className="fixed top-0 left-0 w-32 h-32 border-l border-t border-white/5 pointer-events-none z-20" />
            <div className="fixed top-0 right-0 w-32 h-32 border-r border-t border-white/5 pointer-events-none z-20" />
            <div className="fixed bottom-0 left-0 w-32 h-32 border-l border-b border-white/5 pointer-events-none z-20" />
            <div className="fixed bottom-0 right-0 w-32 h-32 border-r border-b border-white/5 pointer-events-none z-20" />
        </div>
    );
}
