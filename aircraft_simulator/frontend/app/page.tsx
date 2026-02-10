"use client";

import { useEffect } from 'react';
import HeroSection from '@/components/pilot/HeroSection';
import { useSimulationStore } from '@/stores/useSimulationStore';

export default function LandingPage() {
  const setScene = useSimulationStore((state) => state.setScene);

  useEffect(() => {
    // Landing page always shows the cinematic takeoff scene
    setScene('takeoff');
  }, [setScene]);

  // HandleLaunch is now handled by the Link in HeroSection, 
  // but we can pass a dummy or remove the prop if we update HeroSection first.
  // Ideally HeroSection handles navigation internally via Link.

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Hero Section manages its own navigation now */}
      <HeroSection />

      {/* Corner decorations */}
      <div className="fixed top-0 left-0 w-32 h-32 border-l border-t border-white/5 pointer-events-none z-20" />
      <div className="fixed top-0 right-0 w-32 h-32 border-r border-t border-white/5 pointer-events-none z-20" />
      <div className="fixed bottom-0 left-0 w-32 h-32 border-l border-b border-white/5 pointer-events-none z-20" />
      <div className="fixed bottom-0 right-0 w-32 h-32 border-r border-b border-white/5 pointer-events-none z-20" />
    </div>
  );
}
