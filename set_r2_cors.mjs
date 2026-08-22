import fs from "fs";
import path from "path";
import { S3Client, PutBucketCorsCommand, GetBucketCorsCommand } from "@aws-sdk/client-s3";

// Load .env or .env.local
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

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET_NAME = process.env.R2_BUCKET_NAME || "video-player";

async function setCors() {
  console.log("Setting CORS Policy on Cloudflare R2 bucket:", R2_BUCKET_NAME);

  const s3Client = new S3Client({
    region: "auto",
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });

  const corsRules = {
    Bucket: R2_BUCKET_NAME,
    CORSConfiguration: {
      CORSRules: [
        {
          AllowedOrigins: ["*"],
          AllowedMethods: ["GET", "HEAD"],
          AllowedHeaders: ["*"],
          ExposeHeaders: ["Content-Range", "Accept-Ranges", "Content-Length", "ETag"],
          MaxAgeSeconds: 3600,
        },
      ],
    },
  };

  try {
    await s3Client.send(new PutBucketCorsCommand(corsRules));
    console.log("✅ CORS Policy successfully applied to bucket:", R2_BUCKET_NAME);

    const check = await s3Client.send(new GetBucketCorsCommand({ Bucket: R2_BUCKET_NAME }));
    console.log("Verified CORS configuration:", JSON.stringify(check.CORSRules, null, 2));
  } catch (err) {
    console.error("❌ Failed to set CORS:", err);
  }
}

setCors();
