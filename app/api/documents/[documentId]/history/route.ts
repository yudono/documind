import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const documentId = params.documentId;

    const histories = await prisma.item.findMany({
      where: {
        userId,
        parentId: documentId,
        type: "document_history",
      },
      orderBy: { createdAt: "desc" },
      take: 20,
    });

    const items = histories.map((h) => {
      const data = h.content ? JSON.parse(h.content as string) : {};
      return {
        id: h.id,
        title: h.name,
        createdAt: h.createdAt,
        isDraft: !!data.isDraft,
        content: data.html || "",
      };
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching document history:", error);
    return NextResponse.json(
      { error: "Failed to fetch document history" },
      { status: 500 }
    );
  }
}