import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const item = await prisma.item.findFirst({
      where: {
        id: params.tableId,
        userId: (session.user as any).id,
        type: "table",
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const data = item.content ? JSON.parse(item.content) : {};
    return NextResponse.json({
      id: item.id,
      title: item.name,
      content: data,
      isDraft: data.isDraft,
      lastModified: data.lastModified,
    });
  } catch (error) {
    console.error("Error loading table:", error);
    return NextResponse.json(
      { error: "Failed to load table" },
      { status: 500 }
    );
  }
}