import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCache, setCache, delByPattern, delCache } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");
    const type = searchParams.get("type"); // Optional filter by type

    // get filter ?deleted=true
    const deleted = searchParams.get("deleted");

    const whereClause: any = {
      userId: (session.user as any).id,
      parentId: parentId || null,
    };

    // deleteAt null or not
    if (deleted) {
      whereClause.deleteAt = { not: null };
    } else {
      whereClause.deleteAt = null;
    }

    if (type && (type === "folder" || type === "document")) {
      whereClause.type = type;
    }

    const cacheKey = `items:${(session.user as any).id}:${parentId || "root"}:${
      type || "all"
    }:${deleted || "false"}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    const items = await prisma.item.findMany({
      where: whereClause,
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
      orderBy: [
        { type: "asc" }, // Folders first
        { name: "asc" }, // Then alphabetical
      ],
    });

    const payload = items;
    await setCache(cacheKey, payload);

    return NextResponse.json(items);
  } catch (error) {
    console.error("Error fetching items:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, type, parentId, ...itemData } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        { error: "Missing required fields: name, type" },
        { status: 400 }
      );
    }

    if (!["folder", "document"].includes(type)) {
      return NextResponse.json(
        { error: "Type must be either 'folder' or 'document'" },
        { status: 400 }
      );
    }

    // For documents, validate required document fields
    if (type === "document") {
      const { fileType, size } = itemData;
      if (!fileType || !size) {
        return NextResponse.json(
          { error: "Missing required document fields: fileType, size" },
          { status: 400 }
        );
      }
    }

    // Check if item with same name exists in the same parent
    const existingItem = await prisma.item.findFirst({
      where: {
        name,
        parentId: parentId || null,
        userId: (session.user as any).id,
        type,
        deleteAt: null,
      },
    });

    if (existingItem) {
      return NextResponse.json(
        {
          error: `${
            type === "folder" ? "Folder" : "Document"
          } with this name already exists`,
        },
        { status: 409 }
      );
    }

    // For documents, generate mock analysis
    let analysisData = {};
    if (type === "document") {
      analysisData = {
        summary: `This document appears to be a ${
          itemData.fileType?.includes("pdf")
            ? "PDF report"
            : itemData.fileType?.includes("word")
            ? "Word document"
            : "text file"
        } containing business-related content.`,
        keyPoints: JSON.stringify([
          "Strategic business planning and market analysis",
          "Financial projections and budget considerations",
          "Operational efficiency recommendations",
        ]),
        sentiment: Math.random() > 0.5 ? "positive" : "neutral",
        topics: JSON.stringify([
          "Business Strategy",
          "Financial Planning",
          "Market Analysis",
        ]),
      };
    }

    const item = await prisma.item.create({
      data: {
        name,
        type,
        parentId: parentId || null,
        userId: (session.user as any).id,
        ...itemData,
        ...analysisData,
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

    // Invalidate items caches and dashboard stats
    await delByPattern(`items:${(session.user as any).id}:*`);
    await delCache(`dashboard:stats:${(session.user as any).id}`);

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
