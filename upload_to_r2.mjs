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
// node upload_to_r2.mjs --all --bucket 2
// node upload_to_r2.mjs "Vivah_Compressed.mp4" --bucket 1
const args = process.argv.slice(2);
let targetFileNames = [];
let bucketChoice = "1";
let isAll = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === "--bucket" || args[i] === "-b") {
    bucketChoice = args[i + 1] || "1";
    i++;
  } else if (args[i] === "--all" || args[i] === "-a") {
    isAll = true;
  } else if (!args[i].startsWith("-")) {
    targetFileNames.push(args[i]);
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

function validateCredentials() {
  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    console.error(`\n❌ Cloudflare R2 Credentials missing for ${isBucket2 ? "Secondary Bucket (Account 2)" : "Primary Bucket"}!\n`);
    printCredentialsGuide();
    process.exit(1);
  }

  // Check if user accidentally pasted Cloudflare general API token (usually ~40-44 chars) instead of S3 Access Key ID (32 hex chars)
  if (R2_ACCESS_KEY_ID.length !== 32) {
    console.error(`\n❌ Invalid R2 Access Key ID format (current length: ${R2_ACCESS_KEY_ID.length}, expected: 32 hex characters)!\n`);
    console.log("⚠️  Notice:");
    console.log(` Your current R2_ACCESS_KEY_ID_${isBucket2 ? "2" : ""} is: "${R2_ACCESS_KEY_ID.substring(0, 8)}..." (${R2_ACCESS_KEY_ID.length} characters)`);
    console.log(" When creating an R2 API Token in Cloudflare, Cloudflare provides 3 values:");
    console.log("   1. Token value        -> (40-44 characters - general Cloudflare token)");
    console.log("   2. Access Key ID      -> (32 characters hex e.g. 62bdefc64b75ebd7cc7aed5e93652866)");
    console.log("   3. Secret Access Key  -> (64 characters hex)\n");
    console.log(" 👉 You must copy the 32-character 'Access Key ID' into .env.local, NOT the Token value!\n");
    printCredentialsGuide();
    process.exit(1);
  }
}

function printCredentialsGuide() {
  console.log("📋 How to generate R2 API Token in Cloudflare:");
  if (isBucket2) {
    console.log(" 1. Log in to Cloudflare Dashboard (Account ID: " + R2_ACCOUNT_ID + ")");
    console.log(" 2. Navigate to 'R2' -> 'Manage R2 API Tokens'");
    console.log(" 3. Click 'Create API Token' -> select 'Object Read & Write' -> apply to 'videos' bucket");
    console.log(" 4. On the generated screen, copy the 32-character 'Access Key ID' and 64-character 'Secret Access Key'");
    console.log(" 5. Update in .env.local:");
    console.log(`
R2_ACCESS_KEY_ID_2=<32_characters_hex_access_key_id>
R2_SECRET_ACCESS_KEY_2=<64_characters_hex_secret_access_key>
`);
  } else {
    console.log(" Check .env.local for R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY\n");
  }
}

async function uploadSingleFile(s3Client, filePath) {
  const stat = fs.statSync(filePath);
  const fileSizeGB = (stat.size / (1024 * 1024 * 1024)).toFixed(2);
  const fileName = path.basename(filePath);

  console.log("\n----------------------------------------------------------");
  console.log(`📁 Video File:  ${fileName} (${fileSizeGB} GB)`);
  console.log(`🪣 Target R2:   ${R2_BUCKET_NAME}`);
  console.log(`🌐 Public URL:  ${PUBLIC_DEV_URL}/${fileName}`);
  console.log(`🚀 Starting high-speed multipart stream upload...\n`);

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
    queueSize: 6, // 6 parallel chunk uploads
    partSize: 15 * 1024 * 1024, // 15 MB chunks
    leavePartsOnError: false,
  });

  parallelUploads3.on("httpUploadProgress", (progress) => {
    if (progress.loaded && progress.total) {
      const percent = ((progress.loaded / progress.total) * 100).toFixed(1);
      const loadedGB = (progress.loaded / (1024 * 1024 * 1024)).toFixed(2);
      const totalGB = (progress.total / (1024 * 1024 * 1024)).toFixed(2);
      const elapsedSec = (Date.now() - startTime) / 1000;
      const speedMBps = elapsedSec > 0 ? ((progress.loaded / (1024 * 1024)) / elapsedSec).toFixed(1) : "0.0";

      process.stdout.write(
        `\r⏳ Uploading ${fileName}: ${percent}% [${loadedGB} GB / ${totalGB} GB] • Speed: ${speedMBps} MB/s   `
      );
    }
  });

  await parallelUploads3.done();
  const totalTimeSec = ((Date.now() - startTime) / 1000).toFixed(0);

  console.log(`\n✅ Upload of ${fileName} completed in ${totalTimeSec} seconds!`);
  console.log(`🔗 Stream URL: ${PUBLIC_DEV_URL}/${fileName}`);
}

async function uploadToR2() {
  console.log("\n==========================================================");
  console.log(` ☁️  Cloudflare R2 Multipart Video Uploader`);
  console.log(` 🎯 Target Bucket: ${R2_BUCKET_NAME} (${isBucket2 ? "Secondary: Account 2" : "Primary: Account 1"})`);
  console.log("==========================================================");

  validateCredentials();

  let filesToUpload = [];

  if (isAll) {
    if (isBucket2) {
      filesToUpload = ["03_Compressed.mp4", "04_Compressed.mp4", "05_Compressed.mp4"];
    } else {
      filesToUpload = ["Vivah_Compressed.mp4", "yuvan_Muran_Compressed.mp4"];
    }
  } else if (targetFileNames.length > 0) {
    filesToUpload = targetFileNames;
  } else {
    filesToUpload = [isBucket2 ? "03_Compressed.mp4" : "Vivah_Compressed.mp4"];
  }

  // Resolve file paths
  const resolvedFiles = [];
  for (const f of filesToUpload) {
    const fullPath = path.isAbsolute(f) ? f : path.join(process.cwd(), "src", "videos", f);
    if (!fs.existsSync(fullPath)) {
      console.error(`\n❌ Video file not found: ${fullPath}`);
      console.log(`Available in src/videos/:`);
      const videosDir = path.join(process.cwd(), "src", "videos");
      if (fs.existsSync(videosDir)) {
        console.log(fs.readdirSync(videosDir).join(", "));
      }
      process.exit(1);
    }
    resolvedFiles.push(fullPath);
  }

  const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  console.log(`📋 Queued ${resolvedFiles.length} file(s) for upload.`);

  for (const filePath of resolvedFiles) {
    try {
      await uploadSingleFile(s3Client, filePath);
    } catch (err) {
      console.error(`\n❌ Upload failed for ${path.basename(filePath)}:`, err);
      process.exit(1);
    }
  }

  console.log("\n==========================================================");
  console.log(" 🎉 All Uploads to Cloudflare R2 Completed Successfully!");
  console.log("==========================================================");
  console.log("Tip: Remember to run `node set_r2_cors.mjs " + (isBucket2 ? "--bucket 2" : "--bucket 1") + "` if not yet configured.\n");
}

uploadToR2();
