import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const urlParam = searchParams.get("url");
    if (!urlParam) {
      return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
    }

    let targetUrl: URL;
    try {
      targetUrl = new URL(urlParam);
    } catch {
      return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
    }

    if (!["http:", "https:"].includes(targetUrl.protocol)) {
      return NextResponse.json({ error: "Unsupported protocol" }, { status: 400 });
    }

    const upstream = await fetch(targetUrl.toString());
    if (!upstream.ok) {
      return NextResponse.json(
        { error: `Upstream fetch failed: ${upstream.status}` },
        { status: 502 }
      );
    }
    const ct = upstream.headers.get("content-type") || "application/octet-stream";
    const ab = await upstream.arrayBuffer();
    return new Response(Buffer.from(ab), {
      status: 200,
      headers: {
        "Content-Type": ct,
        "Cache-Control": "no-cache",
      },
    });
  } catch (err) {
    console.error("Proxy fetch error:", err);
    return NextResponse.json({ error: "Proxy error" }, { status: 500 });
  }
}