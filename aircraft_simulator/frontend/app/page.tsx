"use client";

import { useEffect } from 'react';
import HeroSection from '@/components/pilot/HeroSection';
import { useSimulationStore } from '@/stores/useSimulationStore';
import { AppContainer } from '@/components/ui/AppContainer';

export default function LandingPage() {
  const setScene = useSimulationStore((state) => state.setScene);

  useEffect(() => {
    setScene('takeoff');
  }, [setScene]);

  return (
    <AppContainer className="relative min-h-screen">
      <HeroSection />
    </AppContainer>
  );
}
