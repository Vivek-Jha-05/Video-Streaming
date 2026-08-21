export interface Video {
  id: string;
  title: string;
  description?: string;
  videoUrl: string;       // Local e.g. "/api/stream/trip.mp4" or "/videos/trip.mp4" or web URL
  thumbnailUrl?: string;  // Poster image
  duration?: number;      // in seconds
  fileSize?: number;      // in bytes
  uploadedAt: string;     // ISO date
  date?: string;          // e.g. "Summer 2024" or "Dec 2023"
}

export interface WatchProgress {
  videoId: string;
  currentTime: number;
  duration: number;
  percent: number;
  lastWatchedAt: string;
  completed?: boolean;
}
