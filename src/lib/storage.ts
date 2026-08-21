import { WatchProgress } from "@/types/video";

const PROGRESS_KEY = "family_stream_watch_progress";

export function getWatchProgressMap(): Record<string, WatchProgress> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(PROGRESS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.error("Failed to read watch progress from localStorage", e);
    return {};
  }
}

export function getVideoProgress(videoId: string): WatchProgress | null {
  const map = getWatchProgressMap();
  return map[videoId] || null;
}

export function saveVideoProgress(
  videoId: string,
  currentTime: number,
  duration: number
): void {
  if (typeof window === "undefined" || !videoId || duration <= 0) return;
  try {
    const map = getWatchProgressMap();
    const percent = Math.min(100, Math.max(0, Math.round((currentTime / duration) * 100)));
    // If watched > 92%, consider completed but keep record
    const completed = percent >= 92;

    map[videoId] = {
      videoId,
      currentTime: Math.floor(currentTime),
      duration: Math.floor(duration),
      percent,
      lastWatchedAt: new Date().toISOString(),
      completed,
    };

    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Failed to save watch progress to localStorage", e);
  }
}

export function clearVideoProgress(videoId: string): void {
  if (typeof window === "undefined") return;
  try {
    const map = getWatchProgressMap();
    delete map[videoId];
    localStorage.setItem(PROGRESS_KEY, JSON.stringify(map));
  } catch (e) {
    console.error("Failed to clear video progress", e);
  }
}

export function getAllContinueWatching(): WatchProgress[] {
  const map = getWatchProgressMap();
  return Object.values(map)
    .filter((p) => !p.completed && p.currentTime > 5) // at least 5s watched, not finished
    .sort((a, b) => new Date(b.lastWatchedAt).getTime() - new Date(a.lastWatchedAt).getTime());
}
