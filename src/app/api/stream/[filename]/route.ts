import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

// Stream local videos stored in src/videos or public/videos with HTTP Range requests (206 Partial Content)
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;
    
    // Sanitize filename to prevent directory traversal
    const safeFilename = path.basename(filename);
    
    // Look in src/videos first, then fallback to public/videos
    const srcVideoPath = path.join(process.cwd(), "src", "videos", safeFilename);
    const publicVideoPath = path.join(process.cwd(), "public", "videos", safeFilename);

    let videoPath = "";
    if (fs.existsSync(srcVideoPath)) {
      videoPath = srcVideoPath;
    } else if (fs.existsSync(publicVideoPath)) {
      videoPath = publicVideoPath;
    } else {
      return NextResponse.json(
        { error: `Video file "${safeFilename}" not found in src/videos or public/videos` },
        { status: 404 }
      );
    }

    const stat = fs.statSync(videoPath);
    const fileSize = stat.size;
    const rangeHeader = req.headers.get("range");

    // Determine content type
    let contentType = "video/mp4";
    if (safeFilename.endsWith(".webm")) contentType = "video/webm";
    if (safeFilename.endsWith(".mov")) contentType = "video/quicktime";
    if (safeFilename.endsWith(".mkv")) contentType = "video/x-matroska";

    if (rangeHeader) {
      // Range header format: "bytes=start-end"
      const parts = rangeHeader.replace(/bytes=/, "").split("-");
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new Response(null, {
          status: 416,
          headers: {
            "Content-Range": `bytes */${fileSize}`,
          },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(videoPath, { start, end });

      // Convert Node.js readable stream to Web standard ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new Response(webStream, {
        status: 206,
        headers: {
          "Content-Range": `bytes ${start}-${end}/${fileSize}`,
          "Accept-Ranges": "bytes",
          "Content-Length": chunkSize.toString(),
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    } else {
      // No range requested: stream the entire file
      const fileStream = fs.createReadStream(videoPath);
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on("data", (chunk) => controller.enqueue(chunk));
          fileStream.on("end", () => controller.close());
          fileStream.on("error", (err) => controller.error(err));
        },
        cancel() {
          fileStream.destroy();
        },
      });

      return new Response(webStream, {
        status: 200,
        headers: {
          "Content-Length": fileSize.toString(),
          "Accept-Ranges": "bytes",
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=3600",
        },
      });
    }
  } catch (error) {
    console.error("Stream route error:", error);
    return NextResponse.json({ error: "Failed to stream video" }, { status: 500 });
  }
}
