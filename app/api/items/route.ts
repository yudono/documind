import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
// import { getCache, setCache, delByPattern, delCache } from "@/lib/cache";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const parentId = searchParams.get("parentId");
    const type = searchParams.get("type"); // Optional filter by type
    const isTemplate = searchParams.get("isTemplate"); // Optional filter by isTemplate
    const deleted = searchParams.get("deleted"); // get filter ?deleted=true
    const page = searchParams.get("page");
    const limit = searchParams.get("limit");
    const search = searchParams.get("search"); // search

    const whereClause: any = {
      parentId: parentId || null,
    };

    if (isTemplate) {
      whereClause.isTemplate = true;
    } else {
      whereClause.isTemplate = false;
      whereClause.userId = (session.user as any).id;
    }

    // deleteAt null or not
    if (deleted) {
      whereClause.deleteAt = { not: null };
    } else {
      whereClause.deleteAt = null;
    }

    if (type && (type === "folder" || type === "document")) {
      whereClause.type = type;
    } else {
      whereClause.type = "document";
    }

    // search
    if (search) {
      whereClause.name = {
        contains: search,
        mode: "insensitive",
      };
    }

    // const cacheKey = `items:${(session.user as any).id}:${parentId || "root"}:${
    //   type || "all"
    // }:${deleted || "false"}`;
    // const cached = await getCache(cacheKey);
    // if (cached) {
    //   return NextResponse.json(cached);
    // }

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
      // paginate only if page and limit are provided
      ...(page && limit
        ? {
            skip: (parseInt(page, 10) - 1) * parseInt(limit || "10", 10),
            take: parseInt(limit, 10),
          }
        : {}),
    });

    // const payload = items;
    // await setCache(cacheKey, payload);

    const totalData = await prisma.item.count({
      where: whereClause,
    });

    return NextResponse.json({
      data: items,
      pagination: {
        total: totalData,
        total_page: Math.ceil(totalData / parseInt(limit || "10", 10)),
        ...(page && limit
          ? {
              page: parseInt(page || "1", 10),
              limit: parseInt(limit || "10", 10),
            }
          : {}),
      },
    });
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
    const { name, type, isTemplate, parentId, ...itemData } = body;

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

    // Remove mock analysis injection; Item no longer stores analysis fields

    const item = await prisma.item.create({
      data: {
        name,
        type,
        parentId: parentId || null,
        userId: (session.user as any).id,
        ...itemData,
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
    // await delByPattern(`items:${(session.user as any).id}:*`);
    // await delCache(`dashboard:stats:${(session.user as any).id}`);

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error("Error creating item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
