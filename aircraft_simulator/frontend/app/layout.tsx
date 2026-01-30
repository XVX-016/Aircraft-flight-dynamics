import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import SceneRoot from "@/components/3d/SceneRoot";
import Navigation from "@/components/pilot/Navigation";
import { Toaster } from "@/components/ui/sonner";
import { SimProvider } from "@/lib/providers/SimProvider";

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
            <body className="bg-background text-foreground antialiased overflow-x-hidden vignette">
                <SimProvider>
                    <Navigation />
                    <SceneRoot />
                    <div className="relative z-10">
                        {children}
                    </div>
                    <Toaster />
                </SimProvider>
            </body>
        </html>
    );
}
