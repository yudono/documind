import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const category = searchParams.get("category") || undefined;
    const minRate = searchParams.get("minRate");
    const maxRate = searchParams.get("maxRate");
    const type = searchParams.get("type") || undefined; // consultation type
    const sort = searchParams.get("sort") || "rating_desc"; // rating_desc | rate_asc | rate_desc | recent
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "12", 10);

    const where: any = {
      status: "active",
      isVerified: true,
    };

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: "insensitive" } },
        { title: { contains: q, mode: "insensitive" } },
        { bio: { contains: q, mode: "insensitive" } },
      ];
    }

    if (category) {
      // Filter by category name via relation
      where.category = { name: { equals: category } };
    }

    if (minRate || maxRate) {
      where.hourlyRate = {};
      if (minRate) where.hourlyRate.gte = Number(minRate);
      if (maxRate) where.hourlyRate.lte = Number(maxRate);
    }

    if (type) {
      // JSON array filter; supported in Prisma JSON filters. Cast to any to allow array_contains.
      where.consultationTypes = { array_contains: type };
    }

    let orderBy: any = undefined;
    switch (sort) {
      case "rate_asc":
        orderBy = { hourlyRate: "asc" };
        break;
      case "rate_desc":
        orderBy = { hourlyRate: "desc" };
        break;
      case "recent":
        orderBy = { createdAt: "desc" };
        break;
      default:
        orderBy = { averageRating: "desc" };
    }

    const skip = (page - 1) * pageSize;
    const client: any = prisma;

    const [items, total] = await Promise.all([
      client.consultant.findMany({
        where,
        orderBy,
        skip,
        take: pageSize,
        select: {
          id: true,
          fullName: true,
          title: true,
          profileImage: true,
          hourlyRate: true,
          currency: true,
          averageRating: true,
          totalReviews: true,
          isVerified: true,
          responseTime: true,
          consultationTypes: true,
          category: {
            select: { id: true, name: true, icon: true, color: true },
          },
          user: { select: { id: true, name: true, image: true } },
        },
      }),
      client.consultant.count({ where }),
    ]);

    return NextResponse.json({
      data: items,
      meta: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    });
  } catch (e: any) {
    console.error("[consultants][GET]", e);
    return NextResponse.json(
      { error: "Failed to fetch consultants" },
      { status: 500 }
    );
  }
}
