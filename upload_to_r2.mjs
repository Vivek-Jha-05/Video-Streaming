import fs from "fs";
import path from "path";
import { S3Client } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";

// Load .env or .env.local if exists
function loadEnv() {
  const envPaths = [path.join(process.cwd(), ".env.local"), path.join(process.cwd(), ".env")];
  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, "utf8");
      for (const line of content.split("\n")) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith("#") && trimmed.includes("=")) {
          const [key, ...rest] = trimmed.split("=");
          const val = rest.join("=").trim().replace(/^["']|["']$/g, "");
          if (!process.env[key.trim()]) {
            process.env[key.trim()] = val;
          }
        }
      }
    }
  }
}

loadEnv();

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID || "";
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID || "";
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY || "";
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "video-player";

// Default video file to upload (or passed as command-line argument: node upload_to_r2.mjs "my-video.mp4")
const defaultFileName = process.argv[2] || "Vivah_Compressed.mp4";
const filePath = path.isAbsolute(defaultFileName)
  ? defaultFileName
  : path.join(process.cwd(), "src", "videos", defaultFileName);

async function uploadToR2() {
  console.log("\n==========================================================");
  console.log(" ☁️  Cloudflare R2 Multipart Video Uploader (Up to 5 TB)");
  console.log("==========================================================");

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error("\n❌ Cloudflare R2 Credentials missing!\n");
    console.log("📋 How to setup in 30 seconds:");
    console.log(" 1. In Cloudflare Dashboard -> Storage & Databases -> R2 Object Storage");
    console.log(" 2. In right sidebar, click 'Manage R2 API Tokens'");
    console.log(" 3. Click 'Create API Token' -> select 'Admin Read & Write' -> 'Create API Token'");
    console.log(" 4. Create a file named .env.local in this project folder with:");
    console.log(`
R2_ACCOUNT_ID=your_account_id
R2_ACCESS_KEY_ID=your_access_key_id
R2_SECRET_ACCESS_KEY=your_secret_access_key
R2_BUCKET_NAME=video-player
`);
    console.log(" 5. Then run: node upload_to_r2.mjs\n");
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ Video file not found: ${filePath}`);
    console.log(`Available in src/videos/:`);
    const videosDir = path.join(process.cwd(), "src", "videos");
    if (fs.existsSync(videosDir)) {
      console.log(fs.readdirSync(videosDir).join(", "));
    }
    process.exit(1);
  }

  const stat = fs.statSync(filePath);
  const fileSizeGB = (stat.size / (1024 * 1024 * 1024)).toFixed(2);
  const fileName = path.basename(filePath);

  console.log(`\n📁 Video File:  ${fileName} (${fileSizeGB} GB)`);
  console.log(`🪣 Target R2:   ${R2_BUCKET_NAME}`);
  console.log(`🚀 Starting high-speed multipart stream upload...\n`);

  const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  const fileStream = fs.createReadStream(filePath);
  const startTime = Date.now();

  const parallelUploads3 = new Upload({
    client: s3Client,
    params: {
      Bucket: R2_BUCKET_NAME,
      Key: fileName,
      Body: fileStream,
      ContentType: "video/mp4",
    },
    queueSize: 6, // 6 parallel chunk uploads for high bandwidth utilization
    partSize: 15 * 1024 * 1024, // 15 MB chunks
    leavePartsOnError: false,
  });

  parallelUploads3.on("httpUploadProgress", (progress) => {
    if (progress.loaded && progress.total) {
      const percent = ((progress.loaded / progress.total) * 100).toFixed(1);
      const loadedGB = (progress.loaded / (1024 * 1024 * 1024)).toFixed(2);
      const totalGB = (progress.total / (1024 * 1024 * 1024)).toFixed(2);
      const elapsedSec = (Date.now() - startTime) / 1000;
      const speedMBps = ((progress.loaded / (1024 * 1024)) / elapsedSec).toFixed(1);

      process.stdout.write(
        `\r⏳ Uploading: ${percent}% [${loadedGB} GB / ${totalGB} GB] • Speed: ${speedMBps} MB/s   `
      );
    }
  });

  try {
    await parallelUploads3.done();
    const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(0);

    console.log("\n\n==========================================================");
    console.log(" ✅ Upload to Cloudflare R2 Completed Successfully!");
    console.log(` ⏱️  Total Time: ${totalTimeSec} seconds`);
    console.log(` 🪣 Bucket:     ${R2_BUCKET_NAME}`);
    console.log(` 🎬 Video Key:  ${fileName}`);
    console.log("==========================================================");
    console.log("\n🔗 To Stream in Family Videos:");
    console.log(" 1. In your Cloudflare bucket 'video-player' -> 'Settings' tab.");
    console.log(" 2. Under 'Public Access', click 'Allow Access' (or Connect Custom Domain).");
    console.log(` 3. Your stream URL will be: https://<public-r2-domain>/${fileName}`);
    console.log(" 4. Paste that URL in http://localhost:3000/manage -> Custom Add!\n");
  } catch (err) {
    console.error("\n❌ Upload failed:", err);
    process.exit(1);
  }
}

uploadToR2();
