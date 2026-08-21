"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Film, Plus, Home } from "lucide-react";

export default function Navbar() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 bg-zinc-950/90 backdrop-blur-md border-b border-zinc-800/80">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center space-x-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-red-600 flex items-center justify-center text-white shadow-md group-hover:bg-red-500 transition-colors">
            <Film className="w-4 h-4" />
          </div>
          <span className="text-lg font-bold text-white tracking-tight">
            Family Videos
          </span>
        </Link>

        {/* Actions */}
        <div className="flex items-center space-x-3">
          <Link
            href="/"
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              pathname === "/"
                ? "bg-zinc-800 text-white"
                : "text-zinc-400 hover:text-white"
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>Library</span>
          </Link>

          <Link
            href="/manage"
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
              pathname === "/manage"
                ? "bg-red-600 text-white shadow"
                : "bg-zinc-800 hover:bg-zinc-700 text-zinc-100 border border-zinc-700/60"
            }`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add / Manage</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
