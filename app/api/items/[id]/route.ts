import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl } from "@/lib/s3";
import { delByPattern, delCache } from "@/lib/cache";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existItem = await prisma.item.findFirst({
      where: {
        id: params.id,
      },
    });

    let item;

    // if existItem.isTemplate, return existItem
    if (existItem?.isTemplate) {
      item = await prisma.item.findFirst({
        where: {
          id: params.id,
        },
        include: {
          parent: true,
          children: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });
    } else {
      item = await prisma.item.findFirst({
        where: {
          id: params.id,
          userId: (session.user as any).id,
        },
        include: {
          parent: true,
          children: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
        },
      });
    }

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json({
      ...item,
      title: item.name,
    });
  } catch (error) {
    console.error("Error fetching item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, ...updateData } = body;

    // Check if item exists and belongs to user
    const existingItem = await prisma.item.findFirst({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // If name is being updated, check for conflicts
    if (name && name !== existingItem.name) {
      const conflictingItem = await prisma.item.findFirst({
        where: {
          name,
          parentId: existingItem.parentId,
          userId: (session.user as any).id,
          type: existingItem.type,
          id: { not: params.id },
        },
      });

      if (conflictingItem) {
        return NextResponse.json(
          {
            error: `${
              existingItem.type === "folder" ? "Folder" : "Document"
            } with this name already exists`,
          },
          { status: 409 }
        );
      }
    }

    const updatedItem = await prisma.item.update({
      where: { id: params.id },
      data: {
        name,
        ...updateData,
      },
      include: {
        parent: true,
        children: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    // Invalidate items caches and dashboard stats after update
    await delByPattern(`items:${(session.user as any).id}:*`);
    await delCache(`dashboard:stats:${(session.user as any).id}`);

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const permanently =
      request.nextUrl?.searchParams.get("permanently") === "true";

    // Check if item exists and belongs to user
    const existingItem = await prisma.item.findFirst({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
      include: {
        children: true,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // If permanently deleting, prevent deleting folders that contain items
    if (
      permanently &&
      existingItem.type === "folder" &&
      existingItem.children.length > 0
    ) {
      return NextResponse.json(
        { error: "Cannot permanently delete folder that contains items" },
        { status: 400 }
      );
    }

    if (permanently) {
      await prisma.item.delete({
        where: { id: params.id },
      });
    } else {
      await prisma.item.update({
        where: { id: params.id },
        data: { deleteAt: new Date() },
      });
    }

    // Invalidate items caches and dashboard stats after delete/move to trash
    await delByPattern(`items:${(session.user as any).id}:*`);
    await delCache(`dashboard:stats:${(session.user as any).id}`);

    return NextResponse.json({
      message: permanently
        ? "Item deleted successfully"
        : "Item moved to trash",
    });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
