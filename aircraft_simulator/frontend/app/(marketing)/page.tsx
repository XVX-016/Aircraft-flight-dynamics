import Link from "next/link";
import { ArrowRight, Plane, Activity, Cpu, Wind } from "lucide-react";

export default function LandingPage() {
  return (
    <div className="bg-neutral-50 dark:bg-neutral-950 min-h-screen">
      {/* Hero Section */}
      <section className="relative h-[80vh] flex flex-col items-center justify-center text-center overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute inset-0 bg-gradient-to-b from-blue-600/10 to-transparent pointer-events-none" />
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl" />
        <div className="absolute top-40 -left-20 w-72 h-72 bg-sky-500/20 rounded-full blur-3xl" />

        <div className="z-10 px-4 max-w-4xl mx-auto space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-sky-500"></span>
            </span>
            System Online v1.0
          </div>

          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-neutral-900 dark:text-white">
            Precision Flight <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-500 to-purple-600">
              Dynamics & Control
            </span>
          </h1>

          <p className="text-lg md:text-xl text-neutral-600 dark:text-neutral-400 max-w-2xl mx-auto leading-relaxed">
            A high-fidelity hardware-in-the-loop simulation platform meant for aerospace research, control law design, and state estimation analysis.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Link
              href="/simulator"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-lg bg-neutral-900 px-8 text-sm font-medium text-white transition-all hover:bg-neutral-800 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
            >
              Launch Simulator
              <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
            </Link>
            <Link
              href="/docs"
              className="inline-flex h-12 items-center justify-center gap-2 rounded-lg border border-neutral-200 bg-transparent px-8 text-sm font-medium text-neutral-900 transition-colors hover:bg-neutral-100 dark:border-neutral-800 dark:text-neutral-100 dark:hover:bg-neutral-800"
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
