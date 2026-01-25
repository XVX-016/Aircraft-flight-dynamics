import Link from "next/link";
import { ArrowRight, Plane, Activity, Cpu, Wind } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="bg-slate-950 min-h-screen text-slate-200">
      {/* Hero Section */}
      <section className="relative h-screen flex flex-col items-center justify-center text-center overflow-hidden">
        {/* Background Image with Overlay */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url("/cockpit-bg.jpg")' }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-slate-950/40 via-slate-950/80 to-slate-950 pointer-events-none" />
        <div className="absolute inset-0 hud-grid opacity-30 pointer-events-none" />

        <div className="z-10 px-6 max-w-5xl mx-auto space-y-10 group">
          <div className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full glass border border-indigo-500/20 text-indigo-400 text-xs font-bold tracking-[0.2em] uppercase transition-all hover:border-indigo-500/40">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            System Online v1.0 • Phase 4
          </div>

          <h1 className="text-6xl md:text-8xl font-black tracking-tight text-white leading-none">
            Precision Flight <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 via-blue-400 to-indigo-600">
              Dynamics & Control
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mx-auto leading-relaxed font-medium">
            A high-fidelity hardware-in-the-loop simulation platform meant for aerospace research, control law design, and state estimation analysis.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center pt-8">
            <Link
              href="/simulator"
              className="group relative inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-10 text-sm font-bold text-white transition-all hover:bg-indigo-500 hover:scale-105 active:scale-95 shadow-2xl shadow-indigo-500/20"
            >
              Launch Pilot Deck
              <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-slate-700 glass px-10 text-sm font-bold text-slate-300 transition-all hover:bg-slate-800/50 hover:text-white"
            >
              Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Feature Grid (Bento Box) */}
      <section className="px-4 py-20 max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Main Feature */}
          <div className="md:col-span-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
              <Plane className="w-48 h-48" />
            </div>
            <div className="relative z-10">
              <div className="w-12 h-12 bg-blue-500/10 rounded-lg flex items-center justify-center mb-6">
                <Wind className="w-6 h-6 text-blue-500" />
              </div>
              <h3 className="text-2xl font-bold mb-3 dark:text-white">6-DOF Physics Engine</h3>
              <p className="text-neutral-500 dark:text-neutral-400 max-w-md">
                Runge-Kutta 4th Order fixed-step integration for high-frequency dynamics. Accurate aerodynamic coefficient lookup tables and moment of inertia tensor modeling.
              </p>
            </div>
          </div>

          {/* Secondary Feature */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-purple-500/10 rounded-lg flex items-center justify-center mb-6">
              <Activity className="w-6 h-6 text-purple-500" />
            </div>
            <h3 className="text-xl font-bold mb-3 dark:text-white">EKF Estimation</h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              State estimation using Extended Kalman Filters to simulate noisy sensor fusion (IMU + GPS).
            </p>
          </div>

          {/* Third Feature */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl p-8 shadow-sm hover:shadow-md transition-shadow">
            <div className="w-12 h-12 bg-emerald-500/10 rounded-lg flex items-center justify-center mb-6">
              <Cpu className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-xl font-bold mb-3 dark:text-white">LQR Control</h3>
            <p className="text-neutral-500 dark:text-neutral-400">
              Optimal control law design with automated gain scheduling for full flight envelope stability.
            </p>
          </div>

          {/* Fourth Feature (Wide) */}
          <div className="md:col-span-2 md:col-start-2 bg-neutral-950 rounded-2xl p-8 shadow-sm relative overflow-hidden">
            <div className="absolute inset-0 bg-grid-white/[0.05] bg-[length:20px_20px]" />
            <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-6">
              <div className="text-white">
                <h3 className="text-xl font-bold mb-2">Real-Time Telemetry</h3>
                <p className="text-neutral-400">Low-latency visualization via WebSockets.</p>
              </div>
              <button className="px-6 py-2 bg-white text-neutral-950 rounded-lg font-medium hover:bg-neutral-200 transition-colors">
                View Live Demo
              </button>
            </div>
          </div>

        </div>
      </section>
    </div>
  );
}
