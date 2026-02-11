"use client";

import { useEffect } from 'react';
import PilotDeck from '@/components/pilot/PilotDeck';
import { toast } from 'sonner';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { AppContainer } from '@/components/ui/AppContainer';

export default function FlightLabPage() {
    const setScene = useSimulationStore((state) => state.setScene);

    useEffect(() => {
        setScene('hangar');

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
        <AppContainer className="relative min-h-screen">
            <PilotDeck onInitialize={handleInitialize} />
        </AppContainer>
    );
}
