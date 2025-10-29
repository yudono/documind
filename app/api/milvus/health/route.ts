import { NextResponse } from "next/server";
import { milvusService, initializeMilvus } from "@/lib/milvus";

// Ensure we run on the Node.js runtime (required for gRPC)
export const runtime = "nodejs";

export async function GET() {
  try {
    if (!milvusService) {
      return NextResponse.json(
        { ok: false, error: "Milvus not configured (missing env vars)" },
        { status: 500 }
      );
    }

    // Initialize and verify connectivity using getVersion()
    await initializeMilvus();
    // At this point connect() has run; get version again for clarity
    const version = await (milvusService as any).client.getVersion();

    return NextResponse.json({ ok: true, version });
  } catch (err: any) {
    return NextResponse.json(
      {
        ok: false,
        error: err?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}