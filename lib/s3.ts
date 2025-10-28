import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";

// Check if S3 is configured
const isS3Configured = !!(
  process.env.S3_ENDPOINT &&
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY &&
  process.env.S3_BUCKET_NAME
);

// Configure S3 client for MinIO (only if configured)
const s3Client = isS3Configured
  ? new S3Client({
      endpoint: process.env.S3_ENDPOINT!,
      region: process.env.S3_REGION || "us-east-1",
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID!,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
      },
      forcePathStyle: true, // Required for MinIO
    })
  : null;

const BUCKET_NAME = process.env.S3_BUCKET_NAME || "document-assistant";

export interface UploadResult {
  key: string;
  url: string;
  bucket: string;
}

function getBaseAppUrl(): string | undefined {
  const candidates = [
    process.env.NEXTAPP_URL,
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
    process.env.S3_ENDPOINT, // fallback to direct S3 endpoint if app URL is not set
  ];
  const base = candidates.find((v) => !!v);
  return base ? String(base).replace(/\/$/, "") : undefined;
}

/**
 * Upload a file to S3 or local storage
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string = "application/octet-stream"
): Promise<UploadResult> {
  try {
    if (isS3Configured && s3Client) {
      // Upload to S3/MinIO
      const command = new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: key,
        Body: file,
        ContentType: contentType,
      });

      await s3Client.send(command);

      // Build absolute URL with robust fallbacks
      const baseUrl = getBaseAppUrl();
      const url = baseUrl
        ? `${baseUrl}/${BUCKET_NAME}/${key}`
        : `/${BUCKET_NAME}/${key}`; // relative fallback

      return {
        key,
        url,
        bucket: BUCKET_NAME,
      };
    } else {
      // Fallback to local storage
      const uploadsDir = join(process.cwd(), "uploads");
      await mkdir(uploadsDir, { recursive: true });

      const filePath = join(uploadsDir, key);
      await writeFile(filePath, file);

      return {
        key,
        url: key,
        bucket: "local",
      };
    }
  } catch (error) {
    console.error("Error uploading file:", error);
    throw new Error("Failed to upload file");
  }
}

/**
 * Get a signed URL for downloading a file
 */
export async function getSignedDownloadUrl(
  key: string,
  expiresIn: number = 3600
): Promise<string> {
  if (!isS3Configured || !s3Client) {
    // For local storage, return direct path
    return `/uploads/${key}`;
  }

  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    const signedUrl = await getSignedUrl(s3Client, command, { expiresIn });
    return signedUrl;
  } catch (error) {
    console.error("Error generating signed URL:", error);
    throw new Error("Failed to generate download URL");
  }
}

/**
 * Delete a file from S3 or local storage
 */
export async function deleteFromS3(key: string): Promise<void> {
  if (!isS3Configured || !s3Client) {
    // For local storage, delete from filesystem
    try {
      const filePath = join(process.cwd(), "uploads", key);
      const { unlink } = await import("fs/promises");
      await unlink(filePath);
    } catch (error) {
      console.error("Error deleting local file:", error);
    }
    return;
  }

  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: key,
    });

    await s3Client.send(command);
  } catch (error) {
    console.error("Error deleting from S3:", error);
    throw new Error("Failed to delete file from S3");
  }
}

/**
 * Generate a unique file key with timestamp and random string
 */
export function generateFileKey(
  originalName: string,
  prefix: string = "documents"
): string {
  const timestamp = Date.now();
  const randomString = Math.random().toString(36).substring(2, 15);
  const extension = originalName.split(".").pop();
  const nameWithoutExtension = originalName.replace(/\.[^/.]+$/, "");

  return `${prefix}/${timestamp}-${randomString}-${nameWithoutExtension}.${extension}`;
}

export { s3Client };
