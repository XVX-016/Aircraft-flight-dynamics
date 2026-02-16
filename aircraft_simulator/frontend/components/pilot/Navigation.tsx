"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

const navItems = [
    { label: "Home", id: "home", path: "/" },
    { label: "Flight Lab", id: "flight", path: "/flight-lab" },
    { label: "Hangar", id: "hangar", path: "/hangar" },
    { label: "LQR Control", id: "lqr", path: "/control" },
    { label: "EKF Estimation", id: "ekf", path: "/estimation" },
    { label: "Validation", id: "validation", path: "/validation" },
];

const Navigation = () => {
    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 z-50 border-b border-white/5 bg-black md:bg-black/40 md:backdrop-blur-md">
            <div className="max-w-[1400px] mx-auto h-full px-6 md:px-8 flex items-center justify-between">

                {/* Brand */}
                <Link href="/" className="flex items-center h-full group">
                    <span className="text-sm font-semibold tracking-[0.25em] text-white/90 group-hover:text-white transition-colors duration-300 uppercase">
                        ADCS-SIM
                    </span>
                </Link>

                {/* Desktop Nav Items — hidden on mobile */}
                <ul className="hidden md:flex items-center gap-8">
                    {navItems.map((item, index) => {
                        const isActive =
                            pathname === item.path ||
                            pathname.startsWith(item.path + "/");

                        return (
                            <li
                                key={item.id}
                                className="opacity-0 animate-fade-in"
                                style={{
                                    animationDelay: `${0.1 + index * 0.05}s`,
                                    animationFillMode: "forwards",
                                }}
                            >
                                <Link
                                    href={item.path}
                                    aria-current={isActive ? "page" : undefined}
                                    className={`py-2 text-[11px] font-mono tracking-[0.2em] uppercase transition-all duration-300 relative group
                    ${isActive
                                            ? "text-white"
                                            : "text-white/40 hover:text-white"
                                        }`}
                                >
                                    {item.label.toUpperCase()}
                                    <span
                                        className={`absolute -bottom-1 left-0 h-px bg-white transition-all duration-300
                      ${isActive
                                                ? "w-full"
                                                : "w-0 group-hover:w-full"
                                            }`}
                                    />
                                </Link>
                            </li>
                        );
                    })}
                </ul>

                {/* Mobile Hamburger — visible on mobile only */}
                <button
                    className="md:hidden flex flex-col justify-center items-center w-8 h-8 gap-1.5"
                    onClick={() => setIsOpen(true)}
                    aria-label="Open menu"
                >
                    <span className="block w-5 h-px bg-white/70" />
                    <span className="block w-5 h-px bg-white/70" />
                    <span className="block w-3.5 h-px bg-white/70" />
                </button>
            </div>

            {/* Mobile Sidebar Overlay — z-[200] to cover vignette (z-100) */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-[200] md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* Mobile Sidebar Drawer — fully opaque, full width, above overlay */}
            <div
                className={`fixed top-0 right-0 h-full w-full bg-black border-l border-white/10 z-[201] transform transition-transform duration-300 ease-out md:hidden
                    ${isOpen ? "translate-x-0" : "translate-x-full"}`}
            >
                {/* Close Button */}
                <button
                    className="absolute top-5 right-5 w-8 h-8 flex items-center justify-center"
                    onClick={() => setIsOpen(false)}
                    aria-label="Close menu"
                >
                    <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/70">
                        <line x1="4" y1="4" x2="20" y2="20" stroke="currentColor" strokeWidth="1.5" />
                        <line x1="20" y1="4" x2="4" y2="20" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                </button>

                {/* Brand in drawer */}
                <div className="px-8 pt-16 pb-8 border-b border-white/5">
                    <span className="text-xs font-mono tracking-[0.25em] text-white/60 uppercase">
                        ADCS-SIM
                    </span>
                </div>

                {/* Nav Links */}
                <ul className="px-8 py-6 flex flex-col gap-1">
                    {navItems.map((item) => {
                        const isActive =
                            pathname === item.path ||
                            pathname.startsWith(item.path + "/");

                        return (
                            <li key={item.id}>
                                <Link
                                    href={item.path}
                                    onClick={() => setIsOpen(false)}
                                    className={`block py-3 text-xs font-mono tracking-[0.2em] uppercase transition-colors duration-200
                                        ${isActive
                                            ? "text-white"
                                            : "text-white/40 hover:text-white"
                                        }`}
                                >
                                    {item.label.toUpperCase()}
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            </div>
        </nav>
    );
};

export default Navigation;

