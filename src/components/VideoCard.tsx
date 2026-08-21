"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Play, Clock } from "lucide-react";
import { Video } from "@/types/video";
import { formatTime, formatDate } from "@/lib/utils";
import { getVideoProgress } from "@/lib/storage";

interface VideoCardProps {
  video: Video;
}

export default function VideoCard({ video }: VideoCardProps) {
  const [progress, setProgress] = useState<{ currentTime: number; percent: number; completed?: boolean } | null>(null);

  useEffect(() => {
    if (video?.id) {
      const saved = getVideoProgress(video.id);
      if (saved && saved.currentTime > 0) {
        setProgress(saved);
      }
    }
  }, [video]);

  return (
    <Link
      href={`/watch/${video.id}`}
      className="group flex flex-col rounded-xl overflow-hidden bg-zinc-900/90 border border-zinc-800 hover:border-zinc-700 transition-all duration-200 hover:shadow-xl focus:outline-none"
    >
      {/* Thumbnail Aspect 16:9 */}
      <div className="relative aspect-video w-full overflow-hidden bg-zinc-950">
        <img
          src={video.thumbnailUrl || "https://images.unsplash.com/photo-1489599849927-2ee91cede3ba?w=800&q=80"}
          alt={video.title}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
        />

        {/* Hover Play Button */}
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-red-600 text-white flex items-center justify-center shadow-lg">
            <Play className="w-5 h-5 fill-white ml-0.5" />
          </div>
        </div>

        {/* Duration Badge */}
        {video.duration && video.duration > 0 && (
          <div className="absolute bottom-2 right-2 px-1.5 py-0.5 rounded bg-black/80 text-[11px] font-mono text-zinc-300">
            {formatTime(video.duration)}
          </div>
        )}

        {/* Watch Progress Bar */}
        {progress && progress.percent > 0 && (
          <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
            <div
              className="h-full bg-red-600"
              style={{ width: `${progress.percent}%` }}
            />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-3.5 space-y-1">
        <h3 className="text-sm font-semibold text-zinc-100 group-hover:text-white line-clamp-1 transition-colors">
          {video.title}
        </h3>

        <div className="flex items-center justify-between text-xs text-zinc-400 pt-0.5">
          <span>{video.date || formatDate(video.uploadedAt)}</span>
          {progress && progress.currentTime > 5 && !progress.completed && (
            <span className="text-red-400 font-medium">
              {progress.percent}% watched
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
