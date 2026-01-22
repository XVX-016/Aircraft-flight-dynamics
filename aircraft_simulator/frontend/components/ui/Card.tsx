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
            "bg-card border border-slate-700/50 rounded-xl overflow-hidden shadow-xl",
            className
        )}>
            {title && (
                <div className="px-4 py-3 border-b border-slate-700/50 bg-slate-800/20">
                    <h3 className="text-sm font-semibold text-slate-300 font-sans tracking-tightuppercase">
                        {title}
                    </h3>
                </div>
            )}
            <div className="p-4">
                {children}
            </div>
        </div>
    );
}
