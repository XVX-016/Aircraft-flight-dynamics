"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

    return (
        <nav className="fixed top-0 left-0 right-0 h-16 bg-black/40 backdrop-blur-md border-b border-white/5 z-50">
            <div className="max-w-[1400px] mx-auto h-full px-8 flex items-center justify-between">

                {/* Brand - Institutional Style */}
                <Link href="/" className="flex items-center h-full group pl-2">
                    <span className="text-sm font-semibold tracking-[0.25em] text-white/90 group-hover:text-white transition-colors duration-300 uppercase">
                        ADCS-SIM
                    </span>
                </Link>

                {/* Nav Items */}
                <ul className="flex items-center gap-8">
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
            </div>
        </nav>
    );
};

export default Navigation;
