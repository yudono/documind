import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const folder = await prisma.folder.findFirst({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Check if folder has documents or subfolders
    const documentsCount = await prisma.document.count({
      where: { folderId: params.id },
    });

    const subfoldersCount = await prisma.folder.count({
      where: { parentId: params.id },
    });

    if (documentsCount > 0 || subfoldersCount > 0) {
      return NextResponse.json(
        {
          error: "Cannot delete folder that contains documents or subfolders",
        },
        { status: 400 }
      );
    }

    await prisma.folder.delete({
      where: {
        id: params.id,
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting folder:", error);
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

    const { name, parentId } = await request.json();

    const folder = await prisma.folder.findFirst({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
    });

    if (!folder) {
      return NextResponse.json({ error: "Folder not found" }, { status: 404 });
    }

    // Check if folder with same name exists in the target parent
    if (name && name !== folder.name) {
      const existingFolder = await prisma.folder.findFirst({
        where: {
          name,
          parentId: parentId !== undefined ? parentId || null : folder.parentId,
          userId: (session.user as any).id,
          id: { not: params.id },
        },
      });

      if (existingFolder) {
        return NextResponse.json(
          { error: "Folder with this name already exists" },
          { status: 409 }
        );
      }
    }

    const updatedFolder = await prisma.folder.update({
      where: {
        id: params.id,
      },
      data: {
        ...(name && { name }),
        ...(parentId !== undefined && { parentId: parentId || null }),
      },
    });

    return NextResponse.json(updatedFolder);
  } catch (error) {
    console.error("Error updating folder:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
