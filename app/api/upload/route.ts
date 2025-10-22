import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { uploadToS3, generateFileKey } from "@/lib/s3";
// Remove top-level sharp import to avoid bundling issues across runtimes
// import sharp from "sharp";

// Force Node.js runtime; sharp is unsupported on Edge
// export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB" },
        { status: 400 }
      );
    }

    // Validate file type
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
      "application/pdf",
      "text/plain",
      "application/msword",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    ];

    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        {
          error:
            "Unsupported file type. Supported types: images, PDF, Word, Excel, and text files",
        },
        { status: 400 }
      );
    }

    // Convert file to buffer
    const bytes = await file.arrayBuffer();
    let buffer: any = Buffer.from(new Uint8Array(bytes));

    // =====================
    // Image compression disabled per request
    // =====================
    // let sharpLib: any = null;
    // try {
    //   const mod = await import("sharp");
    //   sharpLib = (mod as any).default || mod;
    // } catch (err) {
    //   console.warn("Sharp not available; skipping image compression.", err);
    // }
    // if (sharpLib && file.type.startsWith("image/")) {
    //   try {
    //     // Compress image if larger than 2MB
    //     if (buffer.length > 2 * 1024 * 1024) {
    //       buffer = await sharpLib(buffer)
    //         .resize(1920, 1920, {
    //           fit: "inside",
    //           withoutEnlargement: true,
    //         })
    //         .jpeg({ quality: 85 })
    //         .toBuffer();
    //     }
    //   } catch (error) {
    //     console.error("Error processing image:", error);
    //     // Continue with original buffer if processing fails
    //   }
    // }

    // Generate unique file key
    const fileKey = generateFileKey(file.name, "uploads");

    // Upload to S3
    const uploadResult = await uploadToS3(buffer, fileKey, file.type);

    // Return upload result
    return NextResponse.json({
      success: true,
      file: {
        key: uploadResult.key,
        url: uploadResult.url,
        bucket: uploadResult.bucket,
        originalName: file.name,
        size: file.size,
        type: file.type,
        uploadedAt: new Date().toISOString(),
        uploadedBy: (session.user as any).id,
      },
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Failed to upload file" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
