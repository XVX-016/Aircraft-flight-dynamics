import "../globals.css";

export default function SimulatorLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    return (
        <html lang="en">
            <body className="bg-neutral-950 text-neutral-100 overflow-hidden">
                {children}
            </body>
        </html>
    );
}
