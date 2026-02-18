import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import Navigation from "@/components/layout/Navigation";
import { Footer } from "@/components/layout/Footer";
import { Toaster } from "@/components/ui/sonner";
import { AircraftProvider } from "@/context/AircraftContext";
import BackendStatusBanner from "@/components/layout/BackendStatusBanner";

const inter = Inter({ subsets: ["latin"], variable: "--font-sans" });
const jetbrains = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono" });

export const metadata: Metadata = {
    title: "ADCS-SIM | Precision Flight Dynamics",
    description: "High-fidelity aerospace simulation and control analysis tool.",
};

export default function RootLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en" className={`${inter.variable} ${jetbrains.variable}`}>
            <body className="bg-neutral-950 text-slate-200 antialiased overflow-x-hidden">
                <AircraftProvider>
                    <div className="flex flex-col min-h-screen">
                        <Navigation />
                        <BackendStatusBanner />
                        <main className="flex-1 pt-16 relative z-10">
                            {children}
                        </main>
                        <Footer />
                    </div>
                    <Toaster />
                </AircraftProvider>
            </body>
        </html>
    );
}
