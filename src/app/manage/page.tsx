"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { 
  Trash2, 
  Edit, 
  Play, 
  FolderSearch, 
  Check, 
  AlertCircle, 
  FileVideo, 
  RefreshCw, 
  Plus, 
  ArrowLeft,
  UploadCloud
} from "lucide-react";
import { Video } from "@/types/video";
import { formatTime, formatDate, formatFileSize } from "@/lib/utils";
import UploadModal from "@/components/UploadModal";

const SAMPLE_POSTERS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80",
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  "https://images.unsplash.com/photo-1472653431158-6364773b2a56?w=800&q=80",
  "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
];

export default function ManagePage() {
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [scannedFiles, setScannedFiles] = useState<any[]>([]);
  const [scanning, setScanning] = useState(false);
  const [activeTab, setActiveTab] = useState<"library" | "add" | "scan">("library");
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    id: "",
    title: "",
    description: "",
    videoUrl: "",
    thumbnailUrl: SAMPLE_POSTERS[0],
    duration: 300,
    fileSize: 0,
    date: "",
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchVideos = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/videos");
      const data = await res.json();
      if (Array.isArray(data)) {
        setVideos(data);
      }
    } catch (err) {
      console.error("Failed to load videos:", err);
    } finally {
      setLoading(false);
    }
  };

  const scanFolder = async () => {
    try {
      setScanning(true);
      const res = await fetch("/api/scan");
      const data = await res.json();
      if (data.scannedItems) {
        setScannedFiles(data.scannedItems);
      }
    } catch (err) {
      console.error("Failed to scan directory:", err);
    } finally {
      setScanning(false);
    }
  };

  useEffect(() => {
    fetchVideos();
    scanFolder();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.videoUrl) {
      setStatusMessage({ type: "error", text: "Title and Video URL are required." });
      return;
    }

    try {
      const url = "/api/videos";
      const method = editingId ? "PUT" : "POST";
      const body = {
        ...formData,
        id: editingId || undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok) {
        setStatusMessage({
          type: "success",
          text: editingId ? "Video updated successfully!" : "Video added successfully!",
        });
        resetForm();
        fetchVideos();
        scanFolder();
        setActiveTab("library");
      } else {
        const err = await res.json();
        setStatusMessage({ type: "error", text: err.error || "Failed to save video." });
      }
    } catch (err) {
      console.error("Error saving video:", err);
      setStatusMessage({ type: "error", text: "Something went wrong saving the video." });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this video from your family library?")) return;

    try {
      const res = await fetch(`/api/videos?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        setVideos(videos.filter((v) => v.id !== id));
        setStatusMessage({ type: "success", text: "Video removed from library." });
        scanFolder();
      }
    } catch (err) {
      console.error("Failed to delete video:", err);
    }
  };

  const startEdit = (video: Video) => {
    setEditingId(video.id);
    setFormData({
      id: video.id,
      title: video.title,
      description: video.description || "",
      videoUrl: video.videoUrl,
      thumbnailUrl: video.thumbnailUrl || SAMPLE_POSTERS[0],
      duration: video.duration || 0,
      fileSize: video.fileSize || 0,
      date: video.date || "",
    });
    setActiveTab("add");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const quickIndex = (file: any) => {
    setFormData({
      id: `local-${file.filename.replace(/[^a-zA-Z0-9]/g, "-")}`,
      title: file.title,
      description: "",
      videoUrl: `/api/stream/${file.filename}`,
      thumbnailUrl: SAMPLE_POSTERS[Math.floor(Math.random() * SAMPLE_POSTERS.length)],
      duration: 300,
      fileSize: file.size,
      date: new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }),
    });
    setEditingId(null);
    setActiveTab("add");
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      id: "",
      title: "",
      description: "",
      videoUrl: "",
      thumbnailUrl: SAMPLE_POSTERS[0],
      duration: 300,
      fileSize: 0,
      date: "",
    });
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 pt-6 pb-20">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 space-y-6">
        {/* Back Link */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="inline-flex items-center space-x-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Video Library</span>
          </Link>

          {/* Direct Upload Button */}
          <button
            onClick={() => setIsUploadOpen(true)}
            className="px-3.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 shadow"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Video File</span>
          </button>
        </div>

        {/* Header & Tabs */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-zinc-800">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Manage Videos
            </h1>
            <p className="text-xs text-zinc-400 mt-0.5">
              Upload video files, view auto-synced public folder files, or edit details.
            </p>
          </div>

          <div className="flex items-center space-x-2 bg-zinc-900 p-1 rounded-lg border border-zinc-800 self-start sm:self-auto">
            <button
              onClick={() => { setActiveTab("library"); resetForm(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                activeTab === "library"
                  ? "bg-zinc-800 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All Videos ({videos.length})
            </button>
            <button
              onClick={() => setActiveTab("add")}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                activeTab === "add"
                  ? "bg-zinc-800 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{editingId ? "Edit Video" : "Custom Add"}</span>
            </button>
            <button
              onClick={() => { setActiveTab("scan"); scanFolder(); }}
              className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1 ${
                activeTab === "scan"
                  ? "bg-zinc-800 text-white shadow"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <FolderSearch className="w-3.5 h-3.5" />
              <span>Folder Scanner</span>
            </button>
          </div>
        </div>

        {/* Notifications */}
        {statusMessage && (
          <div
            className={`p-3 rounded-lg text-xs flex items-center justify-between ${
              statusMessage.type === "success"
                ? "bg-emerald-950/80 border border-emerald-800 text-emerald-200"
                : "bg-red-950/80 border border-red-800 text-red-200"
            }`}
          >
            <div className="flex items-center space-x-2">
              {statusMessage.type === "success" ? (
                <Check className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button onClick={() => setStatusMessage(null)} className="underline">
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: ALL VIDEOS LIST */}
        {activeTab === "library" && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-900/50">
              <table className="w-full text-left text-xs text-zinc-300">
                <thead className="bg-zinc-900 border-b border-zinc-800 text-[11px] uppercase tracking-wider text-zinc-400 font-semibold">
                  <tr>
                    <th className="p-3.5">Video</th>
                    <th className="p-3.5">Duration</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/60 font-medium">
                  {videos.map((video) => (
                    <tr key={video.id} className="hover:bg-zinc-800/40 transition-colors">
                      <td className="p-3.5 flex items-center space-x-3 min-w-[220px]">
                        <div className="relative w-14 aspect-video rounded overflow-hidden bg-black flex-shrink-0">
                          <img
                            src={video.thumbnailUrl || SAMPLE_POSTERS[0]}
                            alt={video.title}
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div>
                          <p className="font-semibold text-zinc-100 line-clamp-1">{video.title}</p>
                          <p className="text-[10px] text-zinc-500 font-mono line-clamp-1">{video.videoUrl}</p>
                        </div>
                      </td>
                      <td className="p-3.5 font-mono text-zinc-400">
                        {video.duration ? formatTime(video.duration) : "—"}
                      </td>
                      <td className="p-3.5 text-zinc-400">
                        {video.date || formatDate(video.uploadedAt)}
                      </td>
                      <td className="p-3.5 text-right space-x-2 whitespace-nowrap">
                        <Link
                          href={`/watch/${video.id}`}
                          className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 inline-block"
                          title="Watch video"
                        >
                          <Play className="w-3.5 h-3.5" />
                        </Link>
                        <button
                          onClick={() => startEdit(video)}
                          className="p-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 inline-block"
                          title="Edit"
                        >
                          <Edit className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(video.id)}
                          className="p-1.5 rounded bg-red-950/80 hover:bg-red-900 text-red-300 border border-red-800/80 inline-block"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* TAB 2: ADD / EDIT VIDEO FORM */}
        {activeTab === "add" && (
          <form
            onSubmit={handleSubmit}
            className="p-5 sm:p-6 rounded-xl bg-zinc-900/80 border border-zinc-800 space-y-4 max-w-2xl"
          >
            <h2 className="text-base font-bold text-white border-b border-zinc-800 pb-3">
              {editingId ? "Edit Video" : "Add Video Manually"}
            </h2>

            <div className="space-y-3">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Video Title *
                </label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Summer Vacation 2024"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-xs sm:text-sm outline-none focus:border-zinc-500"
                />
              </div>

              {/* Video URL */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Video URL or Local Path *
                </label>
                <input
                  type="text"
                  required
                  value={formData.videoUrl}
                  onChange={(e) => setFormData({ ...formData, videoUrl: e.target.value })}
                  placeholder="e.g. /api/stream/my-clip.mp4 or https://..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-xs sm:text-sm font-mono outline-none focus:border-zinc-500"
                />
                <p className="text-[11px] text-zinc-500">
                  Tip: For files in <code className="text-zinc-400">public/videos/clip.mp4</code>, use <code className="text-amber-300">/api/stream/clip.mp4</code>.
                </p>
              </div>

              {/* Date */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Date / Occasion
                </label>
                <input
                  type="text"
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  placeholder="e.g. Summer 2024 or Dec 25, 2023"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-xs sm:text-sm outline-none focus:border-zinc-500"
                />
              </div>

              {/* Thumbnail URL */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Thumbnail Image URL
                </label>
                <input
                  type="text"
                  value={formData.thumbnailUrl}
                  onChange={(e) => setFormData({ ...formData, thumbnailUrl: e.target.value })}
                  placeholder="https://... or /thumbnails/photo.jpg"
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-xs font-mono outline-none focus:border-zinc-500"
                />

                <div className="pt-1 flex items-center space-x-2 overflow-x-auto no-scrollbar">
                  {SAMPLE_POSTERS.map((poster, i) => (
                    <img
                      key={i}
                      src={poster}
                      alt="Preset"
                      onClick={() => setFormData({ ...formData, thumbnailUrl: poster })}
                      className={`w-14 h-9 object-cover rounded cursor-pointer border ${
                        formData.thumbnailUrl === poster ? "border-red-500 scale-105" : "border-transparent opacity-60"
                      }`}
                    />
                  ))}
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-zinc-300">
                  Description (Optional)
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Brief note or memory..."
                  className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700 rounded-lg text-white text-xs sm:text-sm outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={() => { resetForm(); setActiveTab("library"); }}
                className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-xs font-bold text-white shadow"
              >
                {editingId ? "Save Changes" : "Add Video"}
              </button>
            </div>
          </form>
        )}

        {/* TAB 3: FOLDER SCANNER */}
        {activeTab === "scan" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-white flex items-center gap-2">
                  <FolderSearch className="w-4 h-4 text-red-500" />
                  <span>Files in <code className="text-amber-300 font-mono">public/videos</code></span>
                </h2>
                <p className="text-xs text-zinc-400">
                  Files dropped here are automatically synchronized into your library.
                </p>
              </div>

              <button
                onClick={scanFolder}
                disabled={scanning}
                className="flex items-center space-x-1.5 px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-200 border border-zinc-700"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${scanning ? "animate-spin" : ""}`} />
                <span>Rescan</span>
              </button>
            </div>

            {scannedFiles.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                {scannedFiles.map((file) => (
                  <div
                    key={file.filename}
                    className="p-3 rounded-lg bg-zinc-900 border border-zinc-800 flex flex-col justify-between space-y-2"
                  >
                    <div className="flex items-center space-x-2.5">
                      <FileVideo className="w-5 h-5 text-red-500 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-bold text-white truncate">{file.title}</h4>
                        <p className="text-[10px] text-zinc-400 font-mono truncate">{file.filename}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-zinc-800 text-xs">
                      <span className="text-[11px] text-zinc-500">{formatFileSize(file.size)}</span>
                      <button
                        onClick={() => quickIndex(file)}
                        className="px-2.5 py-1 rounded bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold"
                      >
                        {file.isIndexed ? "Edit Entry" : "Add to Library"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 rounded-xl bg-zinc-900/50 border border-dashed border-zinc-800 text-center space-y-2">
                <FileVideo className="w-8 h-8 text-zinc-600 mx-auto" />
                <h4 className="text-sm font-bold text-zinc-300">No video files in <code className="text-amber-300">public/videos/</code></h4>
                <p className="text-xs text-zinc-500">
                  Drop your family video files into <code className="text-zinc-400">public/videos</code> or click Upload Video above.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Upload Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSuccess={() => {
          fetchVideos();
          scanFolder();
        }}
      />
    </div>
  );
}
