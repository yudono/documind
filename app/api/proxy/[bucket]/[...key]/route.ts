import { NextRequest } from "next/server";
import { s3Client } from "@/lib/s3";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import { readFile } from "fs/promises";
import { join } from "path";

export const runtime = "nodejs";

async function bodyToBuffer(body: any): Promise<Buffer> {
  if (!body) return Buffer.alloc(0);
  // AWS SDK v3 in some runtimes provides transformToByteArray
  if (typeof body.transformToByteArray === "function") {
    const bytes = await body.transformToByteArray();
    return Buffer.from(bytes);
  }
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    body.on("data", (chunk: Buffer) => chunks.push(chunk));
    body.on("end", () => resolve(Buffer.concat(chunks)));
    body.on("error", (err: any) => reject(err));
  });
}

function toArrayBuffer(buf: Buffer): ArrayBuffer {
  const ab = new ArrayBuffer(buf.byteLength);
  const view = new Uint8Array(ab);
  view.set(buf);
  return ab;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { bucket: string; key: string[] } }
) {
  const bucket = params.bucket;
  const keyParts = params.key || [];
  const key = keyParts.join("/");

  try {
    if (s3Client) {
      const cmd = new GetObjectCommand({ Bucket: bucket, Key: key });
      const result = await s3Client.send(cmd);

      const contentType = result.ContentType || "application/octet-stream";
      const buf = await bodyToBuffer((result as any).Body);

      return new Response(toArrayBuffer(buf), {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "public, max-age=60",
          "Content-Disposition": "inline",
        },
      });
    }

    // Fallback to local storage under /uploads
    const localPath = join(process.cwd(), "uploads", key);
    const buf = await readFile(localPath);
    return new Response(toArrayBuffer(Buffer.from(buf)), {
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Disposition": "inline",
      },
    });
  } catch (error: any) {
    const message = error?.message || "Proxy error";
    return new Response(message, { status: 500 });
  }
}