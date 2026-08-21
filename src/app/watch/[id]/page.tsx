"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Calendar, Clock, HardDrive } from "lucide-react";
import { Video } from "@/types/video";
import { formatTime, formatFileSize } from "@/lib/utils";
import VideoPlayer from "@/components/VideoPlayer";
import VideoCard from "@/components/VideoCard";

export default function WatchPage() {
  const params = useParams();
  const id = params?.id as string;

  const [video, setVideo] = useState<Video | null>(null);
  const [otherVideos, setOtherVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      if (!id) return;
      try {
        setLoading(true);
        const res = await fetch("/api/videos");
        const allVideos: Video[] = await res.json();

        if (Array.isArray(allVideos)) {
          const current = allVideos.find((v) => v.id === id);
          if (current) {
            setVideo(current);
            setOtherVideos(allVideos.filter((v) => v.id !== id));
          }
        }
      } catch (err) {
        console.error("Failed to load video:", err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 pt-10 pb-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
          <div className="w-28 h-4 bg-zinc-900 animate-pulse rounded" />
          <div className="w-full aspect-video bg-zinc-900 animate-pulse rounded-2xl border border-zinc-800" />
        </div>
      </div>
    );
  }

  if (!video) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 pt-20 pb-20 text-center space-y-4">
        <h2 className="text-xl font-bold text-white">Video not found</h2>
        <p className="text-xs text-zinc-400">The video you are looking for does not exist in the library.</p>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-700 text-xs font-semibold text-white"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Video Library</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pt-6 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Back Link */}
        <div>
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to all videos</span>
          </Link>
        </div>

        {/* Video Player */}
        <div className="w-full">
          <VideoPlayer video={video} />
        </div>

        {/* Video Title & Info */}
        <div className="space-y-4 pt-2 border-b border-zinc-800 pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              {video.title}
            </h1>

            <div className="flex items-center space-x-3 text-xs text-zinc-400">
              {video.date && (
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                  {video.date}
                </span>
              )}
              {video.duration && video.duration > 0 && (
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-zinc-500" />
                  {formatTime(video.duration)}
                </span>
              )}
              {video.fileSize && (
                <span className="flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-zinc-500" />
                  {formatFileSize(video.fileSize)}
                </span>
              )}
            </div>
          </div>

          {video.description && (
            <p className="text-sm text-zinc-300 leading-relaxed bg-zinc-900/60 p-4 rounded-xl border border-zinc-800">
              {video.description}
            </p>
          )}
        </div>

        {/* More Videos from Library */}
        {otherVideos.length > 0 && (
          <div className="space-y-4 pt-4">
            <h2 className="text-base font-bold text-white">
              More Family Videos
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {otherVideos.map((item) => (
                <VideoCard key={item.id} video={item} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
