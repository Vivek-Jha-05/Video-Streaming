"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, X, Check, AlertCircle, FileVideo, Loader2 } from "lucide-react";
import { formatFileSize } from "@/lib/utils";

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export default function UploadModal({ isOpen, onClose, onSuccess }: UploadModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [date, setDate] = useState("");
  const [description, setDescription] = useState("");
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    if (!title) {
      // Auto populate clean title from filename
      const nameWithoutExt = file.name.replace(/\.[^/.]+$/, "");
      const clean = nameWithoutExt.replace(/[-_]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      setTitle(clean);
    }
    if (!date) {
      setDate(new Date().toLocaleDateString("en-US", { month: "short", year: "numeric" }));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith("video/") || /\.(mp4|webm|mov|mkv|m4v)$/i.test(file.name)) {
        handleFileChange(file);
      } else {
        setErrorMessage("Please select a valid video file (.mp4, .webm, .mov, etc.)");
      }
    }
  };

  const handleUpload = () => {
    if (!selectedFile) {
      setErrorMessage("Please select a video file first.");
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    setErrorMessage(null);

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("title", title || selectedFile.name);
    formData.append("date", date);
    formData.append("description", description);

    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/api/upload");

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        setUploadProgress(percent);
      }
    };

    xhr.onload = () => {
      setIsUploading(false);
      if (xhr.status >= 200 && xhr.status < 300) {
        setUploadProgress(100);
        setTimeout(() => {
          onSuccess();
          onClose();
          // Reset
          setSelectedFile(null);
          setTitle("");
          setDate("");
          setDescription("");
          setUploadProgress(null);
        }, 600);
      } else {
        try {
          const res = JSON.parse(xhr.responseText);
          setErrorMessage(res.error || "Upload failed. Please try again.");
        } catch {
          setErrorMessage("Failed to upload video.");
        }
      }
    };

    xhr.onerror = () => {
      setIsUploading(false);
      setErrorMessage("Network error during upload.");
    };

    xhr.send(formData);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden space-y-4">
        {/* Header */}
        <div className="px-6 pt-5 pb-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="p-1.5 rounded-lg bg-red-600/20 text-red-500">
              <UploadCloud className="w-5 h-5" />
            </div>
            <h3 className="text-base font-bold text-white">Upload Video to Library</h3>
          </div>
          <button
            onClick={onClose}
            disabled={isUploading}
            className="text-zinc-400 hover:text-white p-1 rounded-lg hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="px-6 space-y-4">
          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => !isUploading && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-red-500 bg-red-950/20"
                : selectedFile
                ? "border-zinc-700 bg-zinc-950/80"
                : "border-zinc-700/80 hover:border-zinc-500 bg-zinc-950/40"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*,.mp4,.webm,.mov,.mkv,.m4v"
              onChange={(e) => e.target.files?.[0] && handleFileChange(e.target.files[0])}
              className="hidden"
            />

            {selectedFile ? (
              <div className="space-y-2">
                <div className="w-10 h-10 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-400 flex items-center justify-center mx-auto">
                  <Check className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs font-bold text-white truncate max-w-xs mx-auto">
                    {selectedFile.name}
                  </p>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    {formatFileSize(selectedFile.size)} • Click or drop another to replace
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-8 h-8 text-zinc-500 mx-auto" />
                <div>
                  <p className="text-xs font-semibold text-zinc-200">
                    Drag & drop video here, or <span className="text-red-400 underline">browse</span>
                  </p>
                  <p className="text-[11px] text-zinc-500 mt-0.5">
                    Supports MP4, WebM, MOV, MKV (saved directly to public/videos)
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Metadata Inputs */}
          <div className="space-y-3">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Video Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Summer Vacation 2024"
                disabled={isUploading}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700/80 rounded-lg text-xs text-white placeholder-zinc-500 outline-none focus:border-zinc-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider">
                Date / Occasion
              </label>
              <input
                type="text"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                placeholder="e.g. August 2024 or Birthday Party"
                disabled={isUploading}
                className="w-full px-3 py-2 bg-zinc-950 border border-zinc-700/80 rounded-lg text-xs text-white placeholder-zinc-500 outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          {/* Upload Progress Bar */}
          {uploadProgress !== null && (
            <div className="space-y-1.5 pt-1">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-300">
                <span>{uploadProgress === 100 ? "Finalizing..." : "Uploading directly to public folder..."}</span>
                <span className="font-mono text-red-400">{uploadProgress}%</span>
              </div>
              <div className="w-full h-2 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-red-600 transition-all duration-200"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-zinc-950/60 border-t border-zinc-800 flex items-center justify-end space-x-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isUploading}
            className="px-4 py-2 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleUpload}
            disabled={!selectedFile || isUploading}
            className={`px-5 py-2 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 shadow ${
              selectedFile && !isUploading
                ? "bg-red-600 hover:bg-red-500 text-white cursor-pointer"
                : "bg-zinc-800 text-zinc-500 cursor-not-allowed"
            }`}
          >
            {isUploading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Start Upload</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
