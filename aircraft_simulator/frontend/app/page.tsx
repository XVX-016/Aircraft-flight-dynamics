"use client";

import { useState, useEffect } from 'react';
import HeroSection from '@/components/pilot/HeroSection';
import PilotDeck from '@/components/pilot/PilotDeck';
import WindFlow from '@/components/pilot/WindFlow';
import { toast } from 'sonner';
import { useSimulationStore } from '@/stores/useSimulationStore';

export default function LandingPage() {
  const [showDashboard, setShowDashboard] = useState(false);
  const setScene = useSimulationStore((state) => state.setScene);

  useEffect(() => {
    setScene('takeoff');
  }, [setScene]);

  const handleLaunch = () => {
    setShowDashboard(true);
    setScene('hangar');
    toast.success('System Initialized', {
      description: 'Entering Pilot Control Interface.',
      duration: 2000,
    });
  };

  const handleNavigate = (section: string) => {
    if (section === 'simulator') {
      setShowDashboard(false);
      setScene('takeoff');
      return;
    }

    if (section === 'hangar') {
      setShowDashboard(true);
      setScene('hangar');
      return;
    }

    toast(`Section Access: ${section}`, {
      description: 'Engineering modules are loading...',
      duration: 2000,
    });
  };

  const handleInitialize = () => {
    toast.success('Simulation Active', {
      description: 'ADCS real-time link established.',
      duration: 3000,
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Dynamic Overlays */}
      <WindFlow />

      {/* Dynamic Overlays */}
      <WindFlow />

      {/* Navigation - Moved to Layout */}

      {/* Layout State Machine */}
      {!showDashboard ? (
        <HeroSection onLaunch={handleLaunch} />
      ) : (
        <PilotDeck onInitialize={handleInitialize} />
      )}

      {/* Corner decorations */}
      <div className="fixed top-0 left-0 w-32 h-32 border-l border-t border-white/5 pointer-events-none z-20" />
      <div className="fixed top-0 right-0 w-32 h-32 border-r border-t border-white/5 pointer-events-none z-20" />
      <div className="fixed bottom-0 left-0 w-32 h-32 border-l border-b border-white/5 pointer-events-none z-20" />
      <div className="fixed bottom-0 right-0 w-32 h-32 border-r border-b border-white/5 pointer-events-none z-20" />
    </div>
  );
}
