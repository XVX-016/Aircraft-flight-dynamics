import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
}

export function Card({ children, className, title }: CardProps) {
    return (
        <div className={cn(
            "glass border border-slate-700/50 rounded-2xl overflow-hidden shadow-2xl relative",
            "before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none",
            className
        )}>
            {title && (
                <div className="px-4 py-2.5 border-b border-slate-700/50 bg-slate-900/40 backdrop-blur-sm">
                    <h3 className="text-[11px] font-bold text-slate-400 font-mono tracking-[0.1em] uppercase">
                        {title}
                    </h3>
                </div>
            )}
            <div className="p-5">
                {children}
            </div>
        </div>
    );
}
