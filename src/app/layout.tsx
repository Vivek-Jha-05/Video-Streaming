import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";

export const metadata: Metadata = {
  title: "Family Videos — Personal Video Library",
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
      <body className="bg-zinc-950 text-zinc-100 min-h-screen flex flex-col antialiased selection:bg-red-600 selection:text-white">
        <Navbar />
        <main className="flex-1">{children}</main>

        <footer className="mt-16 border-t border-zinc-900 bg-black/40 py-8 text-center text-xs text-zinc-500">
          <div className="max-w-6xl mx-auto px-4">
            <p>Family Videos — Private Family Streaming</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
