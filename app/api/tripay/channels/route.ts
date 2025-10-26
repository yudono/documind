import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.TRIPAY_API_KEY;
    const baseUrl = process.env.TRIPAY_BASE_URL || "https://tripay.co.id/api";

    if (!apiKey) {
      return NextResponse.json(
        { error: "Tripay API not configured" },
        { status: 500 }
      );
    }

    const res = await fetch(`${baseUrl}/merchant/payment-channel`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    const data = await res.json();

    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || "Failed to fetch payment channels" },
        { status: res.status }
      );
    }

    const channels = Array.isArray(data?.data)
      ? data.data.map((ch: any) => ({
          code: ch.code,
          name: ch.name,
          image: ch.icon_url,
        }))
      : [];

    return NextResponse.json({ success: true, channels });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Unexpected error fetching payment channels" },
      { status: 500 }
    );
  }
}
