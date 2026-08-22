import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Readable } from "stream";
import { Video } from "@/types/video";

export const dynamic = "force-dynamic";

// Increase max execution time for large video uploads if running in supported environments
export const maxDuration = 300;

const dataFilePath = path.join(process.cwd(), "src", "data", "videos.json");
const srcVideosDir = path.join(process.cwd(), "src", "videos");

const SAMPLE_POSTERS = [
  "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=800&q=80",
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=800&q=80",
  "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800&q=80",
  "https://images.unsplash.com/photo-1472653431158-6364773b2a56?w=800&q=80",
  "https://images.unsplash.com/photo-1514565131-fce0801e5785?w=800&q=80",
  "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800&q=80",
];

function getVideos(): Video[] {
  try {
    if (!fs.existsSync(dataFilePath)) return [];
    return JSON.parse(fs.readFileSync(dataFilePath, "utf8"));
  } catch {
    return [];
  }
}

function saveVideos(videos: Video[]) {
  fs.writeFileSync(dataFilePath, JSON.stringify(videos, null, 2), "utf8");
}

export async function POST(req: NextRequest) {
  try {
    if (!fs.existsSync(srcVideosDir)) {
      fs.mkdirSync(srcVideosDir, { recursive: true });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const customTitle = formData.get("title") as string | null;
    const customDate = formData.get("date") as string | null;
    const customDescription = formData.get("description") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No video file provided" }, { status: 400 });
    }

    // Sanitize filename
    const originalName = file.name;
    const ext = path.extname(originalName) || ".mp4";
    const baseName = path.basename(originalName, ext).replace(/[^a-zA-Z0-9_-]/g, "_");
    const safeFilename = `${baseName}${ext}`;
    const destinationPath = path.join(srcVideosDir, safeFilename);

    // Stream the file directly to disk to handle 10 GB+ files without exhausting RAM
    const writeStream = fs.createWriteStream(destinationPath);
    const nodeReadable = Readable.fromWeb(file.stream() as any);
    await pipeline(nodeReadable, writeStream);

    const stat = fs.statSync(destinationPath);

    // Format clean title from filename if not provided
    const cleanTitle = customTitle || baseName
      .replace(/[-_]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());

    const formattedDate = customDate || new Date().toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });

    const videos = getVideos();
    const videoId = `video-${Date.now()}`;

    const newVideo: Video = {
      id: videoId,
      title: cleanTitle,
      description: customDescription || "",
      videoUrl: `/api/stream/${safeFilename}`,
      thumbnailUrl: SAMPLE_POSTERS[Math.floor(Math.random() * SAMPLE_POSTERS.length)],
      fileSize: stat.size,
      uploadedAt: new Date().toISOString(),
      date: formattedDate,
    };

    // Replace duplicate if exists
    const updatedVideos = videos.filter((v) => !v.videoUrl.endsWith(`/${safeFilename}`));
    updatedVideos.unshift(newVideo);
    saveVideos(updatedVideos);

    return NextResponse.json({
      success: true,
      message: "Video uploaded and indexed successfully into src/videos!",
      video: newVideo,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload video file" },
      { status: 500 }
    );
  }
}
