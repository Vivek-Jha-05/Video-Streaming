import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "FamilyStream — Private Family Cinema",
  description: "Watch personal family moments, trips, celebrations, and movies anywhere in high definition.",
  icons: {
    icon: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-cinema-950 text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-cinema-accent selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-zinc-800/60 bg-black/60 py-10 text-center text-xs text-zinc-500">
          <div className="max-w-7xl mx-auto px-4 space-y-2">
            <div className="flex items-center justify-center space-x-2 text-zinc-400 font-semibold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>FamilyStream Live</span>
            </div>
            <p>Private Family Video Streaming Platform • Seamless playback from your static library</p>
            <p className="text-zinc-600">Built for hassle-free family viewing across all devices.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
