"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  Volume1,
  Maximize,
  Minimize,
  RotateCcw,
  RotateCw,
  PictureInPicture2,
  Check,
} from "lucide-react";
import { Video } from "@/types/video";
import { formatTime } from "@/lib/utils";
import { getVideoProgress, saveVideoProgress } from "@/lib/storage";

interface VideoPlayerProps {
  video: Video;
  onEnded?: () => void;
}

export default function VideoPlayer({ video, onEnded }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);

  const [videoSrc, setVideoSrc] = useState(video.videoUrl);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(video.duration || 0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [bufferedPercent, setBufferedPercent] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [resumePrompt, setResumePrompt] = useState<{ time: number } | null>(null);
  const [isSeeking, setIsSeeking] = useState(false);
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPosition, setHoverPosition] = useState<number>(0);
  const [centerAnimation, setCenterAnimation] = useState<"play" | "pause" | "fwd" | "rwd" | null>(null);

  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setVideoSrc(video.videoUrl);
  }, [video.videoUrl]);

  const handleVideoError = () => {
    const fileName = video.videoUrl.split("/").pop();
    if (fileName && !videoSrc.startsWith("/api/stream/")) {
      console.warn("Primary video stream failed, falling back to local stream:", `/api/stream/${fileName}`);
      setVideoSrc(`/api/stream/${fileName}`);
    }
  };

  // Resume playback on initial load
  useEffect(() => {
    if (!video?.id) return;
    const saved = getVideoProgress(video.id);
    if (saved && saved.currentTime > 5 && !saved.completed) {
      setResumePrompt({ time: saved.currentTime });
    }
  }, [video.id]);

  const handleApplyResume = () => {
    if (videoRef.current && resumePrompt) {
      videoRef.current.currentTime = resumePrompt.time;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      setResumePrompt(null);
    }
  };

  const handleDismissResume = () => {
    setResumePrompt(null);
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    }
  };

  // Trigger Center Action Animation
  const triggerActionAnimation = (type: "play" | "pause" | "fwd" | "rwd") => {
    setCenterAnimation(type);
    setTimeout(() => setCenterAnimation(null), 500);
  };

  // Toggle Play / Pause
  const togglePlay = useCallback(() => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
      triggerActionAnimation("play");
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
      triggerActionAnimation("pause");
    }
  }, []);

  // Seek Relative (-10s / +10s)
  const seekRelative = useCallback((seconds: number) => {
    if (!videoRef.current) return;
    const newTime = Math.max(0, Math.min(videoRef.current.duration || 0, videoRef.current.currentTime + seconds));
    videoRef.current.currentTime = newTime;
    setCurrentTime(newTime);
    triggerActionAnimation(seconds > 0 ? "fwd" : "rwd");
  }, []);

  // Toggle Mute
  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    const newMuted = !isMuted;
    videoRef.current.muted = newMuted;
    setIsMuted(newMuted);
  }, [isMuted]);

  // Handle Volume Change
  const handleVolumeChange = (newVolume: number) => {
    if (!videoRef.current) return;
    const clamped = Math.max(0, Math.min(1, newVolume));
    videoRef.current.volume = clamped;
    setVolume(clamped);
    if (clamped === 0) {
      videoRef.current.muted = true;
      setIsMuted(true);
    } else if (isMuted) {
      videoRef.current.muted = false;
      setIsMuted(false);
    }
  };

  // Toggle Fullscreen
  const toggleFullscreen = useCallback(() => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  // Change Playback Speed
  const handlePlaybackRateChange = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setShowSettingsMenu(false);
  };

  // Picture in Picture
  const togglePiP = async () => {
    if (!videoRef.current) return;
    try {
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (document.pictureInPictureEnabled) {
        await videoRef.current.requestPictureInPicture();
      }
    } catch (e) {
      console.error("PiP error", e);
    }
  };

  // Auto-hide controls after inactivity
  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) clearTimeout(controlsTimeoutRef.current);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        if (!showSettingsMenu) {
          setShowControls(false);
        }
      }, 2500);
    }
  };

  // Handle Timeline Scrubber Click & Drag
  const handleTimelineScrub = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressTrackRef.current || !videoRef.current) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const targetTime = pos * (videoRef.current.duration || duration);
    videoRef.current.currentTime = targetTime;
    setCurrentTime(targetTime);
    saveVideoProgress(video.id, targetTime, videoRef.current.duration || duration);
  };

  const handleTimelineHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!progressTrackRef.current) return;
    const rect = progressTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPosition(pos * 100);
    setHoverTime(pos * duration);
  };

  // Synchronize Fullscreen Change Events
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Keyboard Shortcuts Handler
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't intercept if typing in an input
      if (["INPUT", "TEXTAREA"].includes((e.target as HTMLElement)?.tagName)) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          togglePlay();
          break;
        case "arrowleft":
        case "j":
          e.preventDefault();
          seekRelative(-10);
          break;
        case "arrowright":
        case "l":
          e.preventDefault();
          seekRelative(10);
          break;
        case "arrowup":
          e.preventDefault();
          handleVolumeChange(volume + 0.1);
          break;
        case "arrowdown":
          e.preventDefault();
          handleVolumeChange(volume - 0.1);
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          toggleMute();
          break;
        case "p":
          e.preventDefault();
          togglePiP();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [togglePlay, seekRelative, toggleFullscreen, toggleMute, volume]);

  // Track Time & Buffer Progress
  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const current = videoRef.current.currentTime;
    setCurrentTime(current);

    // Calculate buffer
    if (videoRef.current.buffered.length > 0) {
      const bufferedEnd = videoRef.current.buffered.end(videoRef.current.buffered.length - 1);
      const dur = videoRef.current.duration || duration;
      if (dur > 0) {
        setBufferedPercent((bufferedEnd / dur) * 100);
      }
    }

    // Save progress every ~3s
    if (Math.floor(current) % 3 === 0 && current > 2) {
      saveVideoProgress(video.id, current, videoRef.current.duration || duration);
    }
  };

  const handleLoadedMetadata = () => {
    if (!videoRef.current) return;
    const dur = videoRef.current.duration;
    if (dur && !isNaN(dur)) {
      setDuration(dur);
    }
  };

  const currentPercent = duration > 0 ? (currentTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => isPlaying && setShowControls(false)}
      className="relative w-full aspect-video bg-black rounded-2xl overflow-hidden shadow-2xl border border-zinc-800 select-none group"
    >
      {/* Video Stream Element */}
      <video
        ref={videoRef}
        src={videoSrc}
        onError={handleVideoError}
        poster={video.thumbnailUrl}
        preload="metadata"
        playsInline
        onClick={togglePlay}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => {
          setIsPlaying(false);
          saveVideoProgress(video.id, duration, duration);
          if (onEnded) onEnded();
        }}
        className="w-full h-full object-contain cursor-pointer"
      />

      {/* Center Animation Flash */}
      {centerAnimation && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-30">
          <div className="w-20 h-20 rounded-full bg-black/70 backdrop-blur-md border border-zinc-700 flex items-center justify-center animate-ping text-white shadow-2xl">
            {centerAnimation === "play" && <Play className="w-10 h-10 fill-white" />}
            {centerAnimation === "pause" && <Pause className="w-10 h-10 fill-white" />}
            {centerAnimation === "fwd" && <RotateCw className="w-10 h-10" />}
            {centerAnimation === "rwd" && <RotateCcw className="w-10 h-10" />}
          </div>
        </div>
      )}

      {/* Resume Playback Notification Banner */}
      {resumePrompt && (
        <div className="absolute top-4 left-4 right-4 z-40 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 p-3 sm:p-4 rounded-xl shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3 animate-slide-up">
          <div className="flex items-center space-x-3 text-sm">
            <div className="w-8 h-8 rounded-full bg-cinema-accent/20 text-cinema-accent flex items-center justify-center">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <p className="font-semibold text-white">Continue where you left off?</p>
              <p className="text-xs text-zinc-400">
                Previous position: <span className="text-zinc-200 font-mono">{formatTime(resumePrompt.time)}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2 w-full sm:w-auto">
            <button
              onClick={handleDismissResume}
              className="flex-1 sm:flex-initial px-3 py-1.5 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-xs font-semibold text-zinc-300 transition-colors"
            >
              Start Over
            </button>
            <button
              onClick={handleApplyResume}
              className="flex-1 sm:flex-initial px-4 py-1.5 rounded-lg bg-cinema-accent hover:bg-red-600 text-xs font-bold text-white transition-colors shadow-lg"
            >
              Resume Playback
            </button>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40 flex flex-col justify-between p-4 sm:p-6 transition-opacity duration-300 pointer-events-none ${
          showControls ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between pointer-events-auto">
          <div className="flex items-center space-x-2">
            <span className="text-sm sm:text-base font-bold text-white drop-shadow-md line-clamp-1">
              {video.title}
            </span>
          </div>
        </div>

        {/* Bottom Control Bar */}
        <div className="space-y-2 pointer-events-auto">
          {/* Progress Timeline Scrubber */}
          <div
            ref={progressTrackRef}
            onClick={handleTimelineScrub}
            onMouseMove={handleTimelineHover}
            onMouseLeave={() => setHoverTime(null)}
            className="relative w-full h-2 hover:h-3.5 bg-zinc-700/60 rounded-full cursor-pointer transition-all flex items-center group/scrub"
          >
            {/* Buffered Stream Progress */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-zinc-500/40 rounded-full pointer-events-none"
              style={{ width: `${bufferedPercent}%` }}
            />

            {/* Current Playback Progress */}
            <div
              className="absolute left-0 top-0 bottom-0 bg-cinema-accent rounded-full pointer-events-none"
              style={{ width: `${currentPercent}%` }}
            />

            {/* Scrubber Thumb */}
            <div
              className="absolute w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-cinema-accent -ml-1.5 opacity-0 group-hover/scrub:opacity-100 transition-opacity pointer-events-none"
              style={{ left: `${currentPercent}%` }}
            />

            {/* Hover Time Tooltip */}
            {hoverTime !== null && (
              <div
                className="absolute -top-8 px-2 py-1 bg-black/90 border border-zinc-700 text-[11px] font-mono text-white rounded shadow-lg -translate-x-1/2 pointer-events-none"
                style={{ left: `${hoverPosition}%` }}
              >
                {formatTime(hoverTime)}
              </div>
            )}
          </div>

          {/* Action Row */}
          <div className="flex items-center justify-between pt-1">
            {/* Left Controls */}
            <div className="flex items-center space-x-2 sm:space-x-4">
              {/* Play / Pause */}
              <button
                onClick={togglePlay}
                className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                title={isPlaying ? "Pause (Space)" : "Play (Space)"}
              >
                {isPlaying ? <Pause className="w-5 h-5 fill-white" /> : <Play className="w-5 h-5 fill-white" />}
              </button>

              {/* Rewind 10s */}
              <button
                onClick={() => seekRelative(-10)}
                className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                title="Rewind 10s (Left Arrow)"
              >
                <RotateCcw className="w-5 h-5" />
              </button>

              {/* Fast Forward 10s */}
              <button
                onClick={() => seekRelative(10)}
                className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                title="Forward 10s (Right Arrow)"
              >
                <RotateCw className="w-5 h-5" />
              </button>

              {/* Volume Slider */}
              <div className="flex items-center space-x-2 group/vol">
                <button
                  onClick={toggleMute}
                  className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                  title="Mute (M)"
                >
                  {isMuted || volume === 0 ? (
                    <VolumeX className="w-5 h-5 text-red-400" />
                  ) : volume < 0.5 ? (
                    <Volume1 className="w-5 h-5" />
                  ) : (
                    <Volume2 className="w-5 h-5" />
                  )}
                </button>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={isMuted ? 0 : volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  className="w-16 sm:w-20 h-1 bg-zinc-600 accent-cinema-accent cursor-pointer rounded-lg opacity-80 group-hover/vol:opacity-100 transition-opacity"
                />
              </div>

              {/* Time Display */}
              <div className="text-xs sm:text-sm font-mono text-zinc-300">
                <span>{formatTime(currentTime)}</span>
                <span className="text-zinc-500 mx-1">/</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>

            {/* Right Controls */}
            <div className="flex items-center space-x-2 sm:space-x-3 relative">
              {/* Playback Speed Menu */}
              <div className="relative">
                <button
                  onClick={() => setShowSettingsMenu(!showSettingsMenu)}
                  className="px-2 py-1 rounded hover:bg-white/20 text-xs font-bold text-zinc-300 hover:text-white transition-colors font-mono"
                  title="Playback Speed"
                >
                  {playbackRate}x
                </button>

                {showSettingsMenu && (
                  <div className="absolute right-0 bottom-full mb-2 w-32 bg-zinc-900/95 backdrop-blur-md border border-zinc-700 rounded-xl shadow-2xl py-1.5 z-50 animate-fade-in">
                    <div className="px-3 py-1 text-[10px] uppercase font-bold text-zinc-400 border-b border-zinc-800">
                      Speed
                    </div>
                    {[0.5, 0.75, 1, 1.25, 1.5, 2].map((rate) => (
                      <button
                        key={rate}
                        onClick={() => handlePlaybackRateChange(rate)}
                        className={`w-full px-3 py-1.5 text-xs text-left flex items-center justify-between hover:bg-zinc-800 ${
                          playbackRate === rate ? "text-cinema-accent font-bold" : "text-zinc-300"
                        }`}
                      >
                        <span>{rate}x</span>
                        {playbackRate === rate && <Check className="w-3.5 h-3.5 text-cinema-accent" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Picture-in-Picture */}
              <button
                onClick={togglePiP}
                className="p-2 rounded-full hover:bg-white/20 text-white transition-colors hidden sm:block"
                title="Picture in Picture (P)"
              >
                <PictureInPicture2 className="w-5 h-5" />
              </button>

              {/* Fullscreen */}
              <button
                onClick={toggleFullscreen}
                className="p-2 rounded-full hover:bg-white/20 text-white transition-colors"
                title="Fullscreen (F)"
              >
                {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
