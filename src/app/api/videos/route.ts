import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Video } from "@/types/video";

export const dynamic = "force-dynamic";

const dataFilePath = path.join(process.cwd(), "src", "data", "videos.json");

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

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const query = searchParams.get("q")?.toLowerCase();
    const id = searchParams.get("id");
    const scope = searchParams.get("scope"); // "all" | "shared" | "private"

    const host = req.headers.get("x-forwarded-host") || req.headers.get("host") || "";
    const isPrivateDomain =
      host.toLowerCase().startsWith("private.") ||
      scope === "all" ||
      scope === "private";

    let videos = getVideos();

    // Query single video
    if (id) {
      const video = videos.find((v) => v.id === id);
      if (!video) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }
      if (video.visibility === "private" && !isPrivateDomain && !host.includes("localhost")) {
        return NextResponse.json({ error: "Video not found" }, { status: 404 });
      }
      return NextResponse.json(video);
    }

    // Filter by visibility:
    // On shared domain (e.g. videos.vivek-jha.me), only show shared videos
    // On private domain (e.g. private.vivek-jha.me), show all videos
    if (!isPrivateDomain && !host.includes("localhost")) {
      videos = videos.filter((v) => v.visibility !== "private");
    } else if (scope === "private") {
      videos = videos.filter((v) => v.visibility === "private");
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
      visibility: body.visibility === "private" ? "private" : "shared",
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
      visibility: body.visibility ? body.visibility : videos[index].visibility || "shared",
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
