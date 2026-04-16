
"use client";

import React, { useState } from "react";
import Papa from "papaparse";
import { FlightRecord } from "@/types/FlightRecord";

interface FlightLoaderProps {
    onLoad: (records: FlightRecord[]) => void;
}

export default function FlightLoader({ onLoad }: FlightLoaderProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setError(null);

        Papa.parse(file, {
            header: true,
            dynamicTyping: true,
            skipEmptyLines: true,
            complete: (results) => {
                setLoading(false);
                const data = results.data as any[];
                
                // Validate columns
                const required = ["time", "x", "y", "z", "phi_deg", "theta_deg", "psi_deg", "u", "v", "w", "altitude_m"];
                const missing = required.filter(col => !(col in (data[0] || {})));

                if (missing.length > 0) {
                    setError(`Missing columns: ${missing.join(", ")}`);
                    return;
                }

                onLoad(data as FlightRecord[]);
            },
            error: (err) => {
                setLoading(false);
                setError(`Parse error: ${err.message}`);
            }
        });
    };

    return (
        <div className="hud-panel p-8 border border-white/10 bg-white/[0.02] rounded-xl text-center">
            <div className="text-xs font-mono uppercase text-white/40 mb-6 tracking-widest">
                Flight Telemetry Processor
            </div>
            
            <label className="inline-block cursor-pointer">
                <div className="px-12 py-6 border-2 border-dashed border-white/10 hover:border-white/30 transition-colors bg-white/5 rounded-lg group">
                    <div className="text-3xl mb-4 group-hover:scale-110 transition-transform">📄</div>
                    <div className="text-xs font-bold uppercase tracking-widest text-white/90">
                        {loading ? "Decrypting Data..." : "Upload Flight CSV"}
                    </div>
                    <div className="text-[10px] font-mono text-white/40 mt-2">
                        Format: time, x, y, z, orientation, velocity
                    </div>
                </div>
                <input 
                    type="file" 
                    accept=".csv" 
                    className="hidden" 
                    onChange={handleFileUpload}
                    disabled={loading}
                />
            </label>

            {error && (
                <div className="mt-6 p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-mono uppercase tracking-wider">
                    {error}
                </div>
            )}
        </div>
    );
}
