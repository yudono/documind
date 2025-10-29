import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

// GET /api/items/[id]/duplicate
// Duplicates a template item into a new user-owned item
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const templateItem = await prisma.item.findFirst({
      where: { id: params.id },
    });

    if (!templateItem) {
      return NextResponse.json(
        { error: "Template item not found" },
        { status: 404 }
      );
    }

    // Enforce that the source is a template item
    if (!templateItem.isTemplate) {
      return NextResponse.json(
        { error: "Source item is not a template" },
        { status: 400 }
      );
    }

    // Create a new item for the current user, copying document-specific fields
    const duplicated = await prisma.item.create({
      data: {
        name: templateItem.name,
        type: templateItem.type,
        userId: (session.user as any).id,
        parentId: null, // Put duplicated item at root by default
        isTemplate: false,
        fileType: templateItem.fileType || undefined,
        size: templateItem.size || undefined,
        url: templateItem.url || undefined,
        previewUrl: templateItem.previewUrl || undefined,
        key: templateItem.key || undefined,
        bucket: templateItem.bucket || undefined,
        color: templateItem.color || undefined,
      },
    });

    return NextResponse.json({ id: duplicated.id });
  } catch (error) {
    console.error("Error duplicating item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
