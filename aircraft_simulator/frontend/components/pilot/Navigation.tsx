"use client";

import Link from 'next/link';

interface NavigationProps {
    onNavigate?: (section: string) => void;
}

const Navigation = ({ onNavigate }: NavigationProps) => {
    const navItems = [
        { label: 'Simulator', id: 'simulator', path: '/' },
        { label: 'Hangar', id: 'hangar', path: '/hangar' },
        { label: 'LQR Control', id: 'lqr', path: '/control' },
        { label: 'EKF Estimation', id: 'ekf', path: '/estimation' },
        { label: 'Validation', id: 'validation', path: null },
    ];

    return (
        <nav className="fixed top-0 right-0 z-50 p-8">
            <ul className="flex items-center gap-8">
                {navItems.map((item, index) => (
                    <li
                        key={item.id}
                        className="opacity-0 animate-fade-in"
                        style={{ animationDelay: `${0.3 + index * 0.1}s`, animationFillMode: 'forwards' }}
                    >
                        {item.path ? (
                            <Link
                                href={item.path}
                                className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/40 hover:text-white transition-all duration-300 relative group"
                            >
                                {item.label}
                                <span className="absolute -bottom-1 left-0 w-0 h-px bg-white group-hover:w-full transition-all duration-300" />
                            </Link>
                        ) : (
                            <button
                                onClick={() => onNavigate?.(item.id)}
                                className="text-[10px] font-mono tracking-[0.2em] uppercase text-white/40 hover:text-white transition-all duration-300 relative group"
                            >
                                {item.label}
                                <span className="absolute -bottom-1 left-0 w-0 h-px bg-white group-hover:w-full transition-all duration-300" />
                            </button>
                        )}
                    </li>
                ))}
            </ul>
        </nav>
    );
};

export default Navigation;
