import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1", 10);
    const pageSize = parseInt(searchParams.get("pageSize") || "10", 10);
    const skip = (page - 1) * pageSize;

    const [items, total] = await Promise.all([
      prisma.consultantReview.findMany({
        where: { consultantId: id, isPublic: true },
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: {
          id: true,
          rating: true,
          comment: true,
          professionalismRating: true,
          communicationRating: true,
          expertiseRating: true,
          timelinessRating: true,
          createdAt: true,
          client: { select: { id: true, name: true, image: true } },
          booking: {
            select: {
              sessionDate: true,
              sessionType: true,
              sessionDuration: true,
            },
          },
        },
      }),
      prisma.consultantReview.count({
        where: { consultantId: id, isPublic: true },
      }),
    ]);

    return NextResponse.json({
      data: items,
      meta: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
    });
  } catch (e: any) {
    console.error("[consultants/:id/reviews][GET]", e);
    return NextResponse.json(
      { error: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}
