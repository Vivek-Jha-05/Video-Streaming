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

// Parse command line arguments:
// node upload_to_r2.mjs "03_Compressed.mp4" --bucket 2
// node upload_to_r2.mjs "Vivah_Compressed.mp4" --bucket 1
const args = process.argv.slice(2);
let targetFileName = "";
let bucketChoice = "1";

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--bucket" || args[i] === "-b") {
    bucketChoice = args[i + 1] || "1";
    i++;
  } else if (!targetFileName && !args[i].startsWith("-")) {
    targetFileName = args[i];
  }
}

const isBucket2 = bucketChoice === "2" || bucketChoice.toLowerCase() === "videos";

const R2_ACCOUNT_ID = isBucket2
  ? (process.env.R2_ACCOUNT_ID_2 || "3b4b4eaa1670dc3832cb5b855c55f89b")
  : (process.env.R2_ACCOUNT_ID || "");

const R2_ACCESS_KEY_ID = isBucket2
  ? (process.env.R2_ACCESS_KEY_ID_2 || "")
  : (process.env.R2_ACCESS_KEY_ID || "");

const R2_SECRET_ACCESS_KEY = isBucket2
  ? (process.env.R2_SECRET_ACCESS_KEY_2 || "")
  : (process.env.R2_SECRET_ACCESS_KEY || "");

const R2_BUCKET_NAME = isBucket2
  ? (process.env.R2_BUCKET_NAME_2 || "videos")
  : (process.env.R2_BUCKET_NAME || "video-player");

const PUBLIC_DEV_URL = isBucket2
  ? (process.env.R2_PUBLIC_DEV_URL_2 || "https://pub-f9060993f7d84ecf81eb2a3ee914270a.r2.dev")
  : (process.env.R2_PUBLIC_DEV_URL || "https://pub-c67ac6ce7b0146dca5d26b10d4d8ec73.r2.dev");

const defaultFileName = targetFileName || (isBucket2 ? "03_Compressed.mp4" : "Vivah_Compressed.mp4");
const filePath = path.isAbsolute(defaultFileName)
  ? defaultFileName
  : path.join(process.cwd(), "src", "videos", defaultFileName);

async function uploadToR2() {
  console.log("\n==========================================================");
  console.log(` ☁️  Cloudflare R2 Multipart Video Uploader`);
  console.log(` 🎯 Target Bucket: ${R2_BUCKET_NAME} (${isBucket2 ? "Secondary: Account 2" : "Primary: Account 1"})`);
  console.log("==========================================================");

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error(`\n❌ Cloudflare R2 Credentials missing for ${isBucket2 ? "Secondary Bucket (Account 2)" : "Primary Bucket"}!\n`);
    console.log("📋 How to setup in 30 seconds:");
    if (isBucket2) {
      console.log(" 1. In your Secondary Cloudflare Dashboard (Account: 3b4b4eaa1670dc3832cb5b855c55f89b)");
      console.log(" 2. Under R2 Object Storage -> Manage R2 API Tokens");
      console.log(" 3. Create an API Token with Admin Read & Write permissions");
      console.log(" 4. Add into your .env.local file:");
      console.log(`
R2_ACCESS_KEY_ID_2=your_token_access_key_id
R2_SECRET_ACCESS_KEY_2=your_token_secret_access_key
`);
      console.log(' 5. Then run: node upload_to_r2.mjs "03_Compressed.mp4" --bucket 2\n');
    } else {
      console.log(" Check .env.local for R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY\n");
    }
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
  console.log(`🌐 Public URL:  ${PUBLIC_DEV_URL}/${fileName}`);
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
    console.log(` 🔗 Stream URL: ${PUBLIC_DEV_URL}/${fileName}`);
    console.log("==========================================================");
    console.log("\n🔗 To Stream in Family Videos:");
    console.log(` The video URL is: ${PUBLIC_DEV_URL}/${fileName}`);
    console.log(" It can be added to src/data/videos.json or through http://localhost:3000/manage!\n");
  } catch (err) {
    console.error("\n❌ Upload failed:", err);
    process.exit(1);
  }
}

uploadToR2();
