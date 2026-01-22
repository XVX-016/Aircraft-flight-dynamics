import Link from "next/link";

export function Navbar() {
    return (
        <nav className="flex items-center justify-between border-b border-neutral-800 px-8 py-4">
            <span className="font-semibold tracking-wide">
                Aircraft Dynamics & Control
            </span>
            <div className="flex gap-6 text-sm text-neutral-300">
                <Link href="/">Home</Link>
                <Link href="/simulator">Simulator</Link>
                <Link href="/control">Control</Link>
                <Link href="/estimation">EKF</Link>
                <Link href="/validation">Validation</Link>
            </div>
        </nav>
    );
}
