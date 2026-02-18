"use client";

import HeroSection from '@/components/pilot/HeroSection';
import CapabilitiesGrid from '@/components/home/CapabilitiesGrid';
import ValidatedAircraft from '@/components/home/ValidatedAircraft';
import { PhilosophySection } from '@/components/home/PhilosophySection';

export default function LandingPage() {
  return (
    <>
      <HeroSection />
      <CapabilitiesGrid />
      <ValidatedAircraft />
      <PhilosophySection />
    </>
  );
}
