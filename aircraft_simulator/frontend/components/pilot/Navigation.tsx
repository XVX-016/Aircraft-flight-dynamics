"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSimulationStore } from '@/stores/useSimulationStore';

const Navigation = () => {
    const pathname = usePathname();
    const setScene = useSimulationStore((state) => state.setScene);

    const navItems = [
        { label: 'Home', id: 'home', path: '/' },
        { label: 'Flight Lab', id: 'flight', path: '/flight-lab' },
        { label: 'Hangar', id: 'hangar', path: '/hangar' },
        { label: 'LQR Control', id: 'lqr', path: '/control' },
        { label: 'EKF Estimation', id: 'ekf', path: '/estimation' },
        { label: 'Validation', id: 'validation', path: '/validation' },
    ];

    const handleClick = (id: string, path: string | null) => {
        if (id === 'flight') setScene('takeoff');
        if (id === 'hangar') setScene('hangar');
        if (id === 'validation') setScene('void');
    };

    return (
        <nav className="fixed top-0 left-0 w-full z-50 p-6 px-10 pointer-events-none">
            <div className="max-w-[1400px] mx-auto flex justify-between items-center w-full">
                {/* Logo */}
                <Link href="/" className="pointer-events-auto opacity-0 animate-fade-in flex items-center group gap-3" style={{ animationDelay: '0.2s', animationFillMode: 'forwards' }}>
                    <div className="w-8 h-8 bg-white/10 border border-white/20 rounded-sm flex items-center justify-center group-hover:bg-white/20 transition-all duration-300">
                        <span className="text-[10px] font-black text-white/40">A</span>
                    </div>
                    <span className="text-sm font-black tracking-[0.5em] text-white hover:text-white/80 transition-all duration-300">ADCS-SIM</span>
                </Link>

                {/* Nav Items */}
                <ul className="flex items-center gap-8 pointer-events-auto">
                    {navItems.map((item, index) => (
                        <li
                            key={item.id}
                            className="opacity-0 animate-fade-in"
                            style={{ animationDelay: `${0.3 + index * 0.1}s`, animationFillMode: 'forwards' }}
                        >
                            {item.path ? (
                                <Link
                                    href={item.path}
                                    onClick={() => handleClick(item.id, item.path)}
                                    className={`text-[11px] font-mono tracking-[0.25em] uppercase transition-all duration-300 relative group
                                        ${pathname === item.path ? 'text-white' : 'text-white/40 hover:text-white'}`}
                                >
                                    {item.label.toUpperCase()}
                                    <span className={`absolute -bottom-2 left-0 h-px bg-white transition-all duration-300
                                        ${pathname === item.path ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                                </Link>
                            ) : (
                                <span className="text-[11px] font-mono tracking-[0.25em] uppercase text-white/10 cursor-not-allowed">
                                    {item.label.toUpperCase()}
                                </span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
        </nav>
    );
};

export default Navigation;
