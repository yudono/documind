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
    const consultant = await prisma.consultant.findUnique({
      where: { id },
      select: {
        id: true,
        fullName: true,
        title: true,
        bio: true,
        profileImage: true,
        experience: true,
        education: true,
        languages: true,
        specializations: true,
        hourlyRate: true,
        currency: true,
        responseTime: true,
        consultationTypes: true,
        isVerified: true,
        averageRating: true,
        totalReviews: true,
        category: { select: { id: true, name: true, icon: true, color: true } },
        user: { select: { id: true, name: true, email: true, image: true } },
        availableSlots: {
          select: {
            id: true,
            dayOfWeek: true,
            startTime: true,
            endTime: true,
            isAvailable: true,
          },
        },
      },
    });
    if (!consultant) {
      return NextResponse.json(
        { error: "Consultant not found" },
        { status: 404 }
      );
    }
    return NextResponse.json({ data: consultant });
  } catch (e: any) {
    console.error("[consultants/:id][GET]", e);
    return NextResponse.json(
      { error: "Failed to fetch consultant" },
      { status: 500 }
    );
  }
}
