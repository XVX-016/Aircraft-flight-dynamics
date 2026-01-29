"use client";

import { useEffect, useState } from 'react';

interface WindLine {
    id: number;
    top: string;
    width: string;
    delay: string;
    duration: string;
}

const WindFlow = () => {
    const [lines, setLines] = useState<WindLine[]>([]);

    useEffect(() => {
        const newLines = Array.from({ length: 12 }, (_, i) => ({
            id: i,
            top: `${8 + i * 8}%`,
            width: `${40 + Math.random() * 30}%`,
            delay: `${i * 0.6}s`,
            duration: `${6 + Math.random() * 4}s`,
        }));
        setLines(newLines);
    }, []);

    if (lines.length === 0) return null;

    return (
        <div className="wind-flow">
            {lines.map((line) => (
                <div
                    key={line.id}
                    className="wind-line"
                    style={{
                        top: line.top,
                        width: line.width,
                        animationDelay: line.delay,
                        animationDuration: line.duration,
                    }}
                />
            ))}
        </div>
    );
};

export default WindFlow;
