"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { Search, Film, Plus, RotateCcw, X, UploadCloud, RefreshCw } from "lucide-react";
import { Video } from "@/types/video";
import { getAllContinueWatching } from "@/lib/storage";
import VideoCard from "@/components/VideoCard";
import UploadModal from "@/components/UploadModal";

export default function HomePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [continueWatchingList, setContinueWatchingList] = useState<Video[]>([]);
  const [isPrivateVault, setIsPrivateVault] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const loadVideos = async () => {
    try {
      setLoading(true);
      if (typeof window !== "undefined") {
        const isPriv = window.location.hostname.startsWith("private.") || window.location.search.includes("scope=private");
        setIsPrivateVault(isPriv);
      }
      const res = await fetch("/api/videos");
      const data = await res.json();
      if (Array.isArray(data)) {
        setVideos(data);
        
        // Match continue watching
        const inProgress = getAllContinueWatching();
        const matched = inProgress
          .map((item) => data.find((v) => v.id === item.videoId))
          .filter((v): v is Video => Boolean(v));
        setContinueWatchingList(matched);
      }
    } catch (err) {
      console.error("Failed to load videos:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVideos();
  }, []);

  const filteredVideos = useMemo(() => {
    if (!searchQuery.trim()) return videos;
    const q = searchQuery.toLowerCase().trim();
    return videos.filter((v) => {
      const title = v.title.toLowerCase();
      const desc = v.description?.toLowerCase() || "";
      const date = v.date?.toLowerCase() || "";
      return title.includes(q) || desc.includes(q) || date.includes(q);
    });
  }, [videos, searchQuery]);

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pb-20">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-8 sm:pt-10 space-y-8">
        {/* Top Header & Quick Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <span>{isPrivateVault ? "Private Family Vault" : "Family Video Library"}</span>
              {isPrivateVault && (
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-800/80">
                  Immediate Family
                </span>
              )}
            </h1>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1 flex items-center gap-2">
              <span>{videos.length} {videos.length === 1 ? "video" : "videos"} in your collection</span>
            </p>
          </div>

          {/* Quick Search & Upload Button */}
          <div className="flex items-center space-x-2.5 w-full sm:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-zinc-500">
                <Search className="w-4 h-4" />
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search videos..."
                className="w-full pl-9 pr-8 py-2 bg-zinc-900 border border-zinc-700/80 focus:border-zinc-500 rounded-lg text-sm text-white placeholder-zinc-500 outline-none transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-zinc-400 hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Quick Upload Video Button */}
            <button
              onClick={() => setIsUploadOpen(true)}
              className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 whitespace-nowrap shadow transition-colors"
            >
              <UploadCloud className="w-4 h-4" />
              <span>Upload Video</span>
            </button>
          </div>
        </div>

        {/* Continue Watching Section */}
        {!searchQuery && continueWatchingList.length > 0 && (
          <div className="space-y-3 pb-6 border-b border-zinc-800/80">
            <div className="flex items-center space-x-2 text-xs font-bold text-zinc-300 uppercase tracking-wider">
              <RotateCcw className="w-3.5 h-3.5 text-red-500" />
              <span>Continue Watching</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {continueWatchingList.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          </div>
        )}

        {/* All Videos Grid */}
        <div className="space-y-4">
          {!searchQuery && continueWatchingList.length > 0 && (
            <h2 className="text-sm font-bold text-zinc-300 uppercase tracking-wider">
              All Videos
            </h2>
          )}

          {loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <div
                  key={i}
                  className="aspect-video bg-zinc-900 animate-pulse rounded-xl border border-zinc-800"
                />
              ))}
            </div>
          ) : filteredVideos.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
              {filteredVideos.map((video) => (
                <VideoCard key={video.id} video={video} />
              ))}
            </div>
          ) : (
            <div className="py-20 text-center space-y-3 max-w-sm mx-auto">
              <div className="w-12 h-12 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mx-auto text-zinc-500">
                <Film className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-white">
                {searchQuery ? "No matching videos" : "No videos in library"}
              </h3>
              <p className="text-xs text-zinc-400">
                {searchQuery
                  ? "Try searching for a different keyword."
                  : "Click below to upload and add your first family video."}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setIsUploadOpen(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow"
                >
                  <UploadCloud className="w-4 h-4" />
                  <span>Upload First Video</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          loadVideos();
        }}
      />
    </div>
  );
}
