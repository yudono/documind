import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const item = await prisma.item.findFirst({
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

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    return NextResponse.json(item);
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

    // For folders, check if they have children
    if (existingItem.type === "folder" && existingItem.children.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete folder that contains items" },
        { status: 400 }
      );
    }

    await prisma.item.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
