interface CardProps {
    children: React.ReactNode;
    className?: string; // Allow minimal overrides if absolutely necessary
    showAccent?: boolean; // Optional top accent line for Feature cards
}

export function Card({ children, className = '', showAccent = false }: CardProps) {
    return (
        <div className={`
      group relative
      aspect-square
      bg-black
      border border-white/10
      p-8
      flex flex-col justify-between
      transition-all duration-300
      hover:border-white/20
      hover:bg-neutral-950
      ${className}
    `}>
            {/* Optional Top Accent for Feature Cards */}
            {showAccent && (
                <div className="h-1 w-12 bg-white/30 mb-6 group-hover:w-20 transition-all duration-300" />
            )}

            {children}
        </div>
    );
}
