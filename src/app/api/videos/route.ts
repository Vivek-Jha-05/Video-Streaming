import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Video } from "@/types/video";

export const dynamic = "force-dynamic";

const dataFilePath = path.join(process.cwd(), "src", "data", "videos.json");
const srcVideosDir = path.join(process.cwd(), "src", "videos");
const publicVideosDir = path.join(process.cwd(), "public", "videos");

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
  } catch (error) {
    console.error("Error reading videos.json:", error);
    return [];
  }
}

function saveVideos(videos: Video[]) {
  try {
    fs.writeFileSync(dataFilePath, JSON.stringify(videos, null, 2), "utf8");
  } catch (error) {
    console.error("Error writing videos.json:", error);
  }
}

// Auto-sync files physically present in src/videos and public/videos
function syncVideosDirectories(catalog: Video[]): Video[] {
  try {
    if (!fs.existsSync(srcVideosDir)) {
      fs.mkdirSync(srcVideosDir, { recursive: true });
    }
    if (!fs.existsSync(publicVideosDir)) {
      fs.mkdirSync(publicVideosDir, { recursive: true });
    }

    const videoExts = [".mp4", ".webm", ".mov", ".mkv", ".m4v"];
    
    // Collect all video files from both directories
    const srcFiles = fs.existsSync(srcVideosDir)
      ? fs.readdirSync(srcVideosDir).filter((f) => videoExts.includes(path.extname(f).toLowerCase()))
      : [];
    const publicFiles = fs.existsSync(publicVideosDir)
      ? fs.readdirSync(publicVideosDir).filter((f) => videoExts.includes(path.extname(f).toLowerCase()))
      : [];

    const allDetectedFiles = Array.from(new Set([...srcFiles, ...publicFiles]));

    let updated = false;
    const currentVideos = [...catalog];

    for (const filename of allDetectedFiles) {
      const isAlreadyIndexed = currentVideos.some(
        (v) =>
          v.videoUrl === `/api/stream/${filename}` ||
          v.videoUrl === `/videos/${filename}` ||
          v.videoUrl.endsWith(`/${filename}`)
      );

      if (!isAlreadyIndexed) {
        const filePath = fs.existsSync(path.join(srcVideosDir, filename))
          ? path.join(srcVideosDir, filename)
          : path.join(publicVideosDir, filename);

        const stat = fs.statSync(filePath);
        const ext = path.extname(filename);
        const cleanTitle = path
          .basename(filename, ext)
          .replace(/[-_]/g, " ")
          .replace(/\b\w/g, (c) => c.toUpperCase());

        const newEntry: Video = {
          id: `local-${path.basename(filename, ext).replace(/[^a-zA-Z0-9_-]/g, "-")}`,
          title: cleanTitle,
          description: "",
          videoUrl: `/api/stream/${filename}`,
          thumbnailUrl: SAMPLE_POSTERS[Math.floor(Math.random() * SAMPLE_POSTERS.length)],
          fileSize: stat.size,
          uploadedAt: stat.mtime.toISOString(),
          date: stat.mtime.toLocaleDateString("en-US", { month: "short", year: "numeric" }),
        };

        currentVideos.unshift(newEntry);
        updated = true;
      }
    }

    if (updated) {
      saveVideos(currentVideos);
    }

    return currentVideos;
  } catch (err) {
    console.error("Auto-sync error:", err);
    return catalog;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase();
    const id = searchParams.get("id");

    let videos = getVideos();

    // Query single video
    if (id) {
      const video = videos.find((v) => v.id === id);
      if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }
      return NextResponse.json(video);
    }

    // Search filter
    if (query) {
      videos = videos.filter((v) => {
        const titleMatch = v.title.toLowerCase().includes(query);
        const descMatch = v.description?.toLowerCase().includes(query);
        const dateMatch = v.date?.toLowerCase().includes(query);
        return titleMatch || descMatch || dateMatch;
      });
    }

    return NextResponse.json(videos);
  } catch (error) {
    console.error("GET /api/videos error:", error);
    return NextResponse.json({ error: "Failed to fetch videos" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const videos = getVideos();

    if (!body.title || !body.videoUrl) {
      return NextResponse.json(
        { error: "Title and videoUrl are required" },
        { status: 400 }
      );
    }

    const newVideo: Video = {
      id: body.id || `video-${Date.now()}`,
      title: body.title,
      description: body.description || "",
      videoUrl: body.videoUrl,
      thumbnailUrl: body.thumbnailUrl || SAMPLE_POSTERS[0],
      duration: body.duration ? Number(body.duration) : undefined,
      fileSize: body.fileSize ? Number(body.fileSize) : undefined,
      uploadedAt: new Date().toISOString(),
      date: body.date || "",
    };

    videos.unshift(newVideo);
    saveVideos(videos);

    return NextResponse.json(newVideo, { status: 201 });
  } catch (error) {
    console.error("POST /api/videos error:", error);
    return NextResponse.json({ error: "Failed to save video" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
    }

    let videos = getVideos();
    const index = videos.findIndex((v) => v.id === body.id);

    if (index === -1) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    videos[index] = {
      ...videos[index],
      ...body,
    };

    saveVideos(videos);
    return NextResponse.json(videos[index]);
  } catch (error) {
    console.error("PUT /api/videos error:", error);
    return NextResponse.json({ error: "Failed to update video" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "Video ID is required" }, { status: 400 });
    }

    let videos = getVideos();
    const filtered = videos.filter((v) => v.id !== id);

    if (filtered.length === videos.length) {
      return NextResponse.json({ error: "Video not found" }, { status: 404 });
    }

    saveVideos(filtered);
    return NextResponse.json({ success: true, id });
  } catch (error) {
    console.error("DELETE /api/videos error:", error);
    return NextResponse.json({ error: "Failed to delete video" }, { status: 500 });
  }
}
