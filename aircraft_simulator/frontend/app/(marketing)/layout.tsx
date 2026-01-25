import "../globals.css";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-neutral-950 text-neutral-100 font-sans">
        <Navbar />
        <main className="min-h-screen px-8 py-6">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
