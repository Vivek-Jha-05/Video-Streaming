import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Video } from "@/types/video";

export async function GET() {
  try {
    const publicVideosDir = path.join(process.cwd(), "public", "videos");
    const dataFilePath = path.join(process.cwd(), "src", "data", "videos.json");

    if (!fs.existsSync(publicVideosDir)) {
      fs.mkdirSync(publicVideosDir, { recursive: true });
    }

    // Read current catalog
    let catalog: Video[] = [];
    if (fs.existsSync(dataFilePath)) {
      catalog = JSON.parse(fs.readFileSync(dataFilePath, "utf8"));
    }

    const files = fs.readdirSync(publicVideosDir);
    const videoExtensions = [".mp4", ".webm", ".mov", ".mkv", ".m4v"];
    const foundVideoFiles = files.filter((f) =>
      videoExtensions.includes(path.extname(f).toLowerCase())
    );

    const scannedItems = foundVideoFiles.map((filename) => {
      const filePath = path.join(publicVideosDir, filename);
      const stat = fs.statSync(filePath);
      const ext = path.extname(filename);
      const titleClean = path
        .basename(filename, ext)
        .replace(/[-_]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase());

      // Check if already in catalog
      const existing = catalog.find(
        (v) =>
          v.videoUrl === `/videos/${filename}` ||
          v.videoUrl === `/api/stream/${filename}`
      );

      return {
        filename,
        title: titleClean,
        size: stat.size,
        modifiedAt: stat.mtime.toISOString(),
        isIndexed: Boolean(existing),
        videoUrl: `/api/stream/${filename}`,
        catalogId: existing?.id,
      };
    });

    return NextResponse.json({
      totalFiles: foundVideoFiles.length,
      scannedItems,
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ error: "Failed to scan public/videos directory" }, { status: 500 });
  }
}
