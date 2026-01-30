"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useSimulationStore } from '@/stores/useSimulationStore';

const Navigation = () => {
    const pathname = usePathname();
    const setScene = useSimulationStore((state) => state.setScene);

    const navItems = [
        { label: 'Simulator', id: 'simulator', path: '/' },
        { label: 'Hangar', id: 'hangar', path: '/hangar' },
        { label: 'LQR Control', id: 'lqr', path: '/control' },
        { label: 'EKF Estimation', id: 'ekf', path: '/estimation' },
        { label: 'Validation', id: 'validation', path: null }, // Placeholder
    ];

    const handleClick = (id: string, path: string | null) => {
        if (id === 'simulator') setScene('takeoff');
        if (id === 'hangar') setScene('hangar');
    };

    return (
        <nav className="fixed top-0 left-0 w-full flex justify-center z-50 p-8 pointer-events-none">
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
                                className={`text-[10px] font-mono tracking-[0.2em] uppercase transition-all duration-300 relative group
                                    ${pathname === item.path ? 'text-white' : 'text-white/40 hover:text-white'}`}
                            >
                                {item.label}
                                <span className={`absolute -bottom-1 left-0 h-px bg-white transition-all duration-300
                                    ${pathname === item.path ? 'w-full' : 'w-0 group-hover:w-full'}`} />
                            </Link>
                        ) : (
                            <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/20 cursor-not-allowed">
                                {item.label}
                            </span>
                        )}
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default Navigation;
