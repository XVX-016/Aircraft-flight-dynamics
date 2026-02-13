import { ReactNode } from 'react';

interface AppContainerProps {
    children: ReactNode;
    className?: string;
}

export function AppContainer({ children, className = "" }: AppContainerProps) {
    return (
        <div className={`max-w-[1400px] mx-auto px-8 w-full ${className}`}>
            {children}
        </div>
    );
}
