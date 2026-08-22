import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";
import { Video } from "@/types/video";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const srcVideosDir = path.join(process.cwd(), "src", "videos");
    const publicVideosDir = path.join(process.cwd(), "public", "videos");
    const dataFilePath = path.join(process.cwd(), "src", "data", "videos.json");

    if (!fs.existsSync(srcVideosDir)) fs.mkdirSync(srcVideosDir, { recursive: true });
    if (!fs.existsSync(publicVideosDir)) fs.mkdirSync(publicVideosDir, { recursive: true });

    // Read current catalog
    let catalog: Video[] = [];
    if (fs.existsSync(dataFilePath)) {
      catalog = JSON.parse(fs.readFileSync(dataFilePath, "utf8"));
    }

    const videoExts = [".mp4", ".webm", ".mov", ".mkv", ".m4v"];

    const getFilesFromDir = (dir: string, locationName: string) => {
      if (!fs.existsSync(dir)) return [];
      return fs.readdirSync(dir)
        .filter((f) => videoExts.includes(path.extname(f).toLowerCase()))
        .map((filename) => {
          const filePath = path.join(dir, filename);
          const stat = fs.statSync(filePath);
          const ext = path.extname(filename);
          const titleClean = path
            .basename(filename, ext)
            .replace(/[-_]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase());

          const existing = catalog.find(
            (v) =>
              v.videoUrl === `/api/stream/${filename}` ||
              v.videoUrl === `/videos/${filename}` ||
              v.videoUrl.endsWith(`/${filename}`)
          );

          return {
            filename,
            location: locationName,
            title: titleClean,
            size: stat.size,
            modifiedAt: stat.mtime.toISOString(),
            isIndexed: Boolean(existing),
            videoUrl: `/api/stream/${filename}`,
            catalogId: existing?.id,
          };
        });
    };

    const srcItems = getFilesFromDir(srcVideosDir, "src/videos");
    const publicItems = getFilesFromDir(publicVideosDir, "public/videos");

    const allItems = [...srcItems, ...publicItems];

    return NextResponse.json({
      totalFiles: allItems.length,
      scannedItems: allItems,
    });
  } catch (error) {
    console.error("Scan error:", error);
    return NextResponse.json({ error: "Failed to scan videos directory" }, { status: 500 });
  }
}
