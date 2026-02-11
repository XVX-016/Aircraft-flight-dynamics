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
        <nav className="fixed top-0 left-0 right-0 h-16 bg-black/40 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-10 z-50">
            {/* Logo */}
            <Link href="/" className="flex items-center group transition-all duration-300">
                <span className="text-sm font-medium tracking-[0.2em] text-white/90 hover:text-white transition-all duration-300 uppercase">
                    ADCS-SIM
                </span>
            </Link>

            {/* Nav Items */}
            <ul className="flex items-center gap-8">
                {navItems.map((item, index) => (
                    <li
                        key={item.id}
                        className="opacity-0 animate-fade-in"
                        style={{ animationDelay: `${0.1 + index * 0.05}s`, animationFillMode: 'forwards' }}
                    >
                        {item.path ? (
                            <Link
                                href={item.path}
                                onClick={() => handleClick(item.id, item.path)}
                                className={`text-[11px] font-mono tracking-[0.2em] uppercase transition-all duration-300 relative group
                                    ${pathname === item.path ? 'text-white' : 'text-white/40 hover:text-white'}`}
                            >
                                {item.label.toUpperCase()}
                                <span className={`absolute -bottom-1 left-0 h-px bg-white transition-all duration-300
                                    ${pathname === item.path ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                            </Link>
                        ) : (
                            <span className="text-[11px] font-mono tracking-[0.2em] uppercase text-white/10 cursor-not-allowed">
                                {item.label.toUpperCase()}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default Navigation;
