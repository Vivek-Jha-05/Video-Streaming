import Link from "next/link";
import { ArrowLeft, Film } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center p-6 text-center">
      <div className="max-w-md space-y-4">
        <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
          <Film className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-white">Page or Video Not Found</h2>
        <p className="text-xs text-zinc-400">
          The page or video you are looking for does not exist in your family library.
        </p>
        <div>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Video Library</span>
          </Link>
        </div>
      </div>
    </div>
  );
}
