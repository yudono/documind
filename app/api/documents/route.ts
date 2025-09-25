import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const folderId = searchParams.get('folderId');

    const documents = await prisma.document.findMany({
      where: {
        userId: (session.user as any).id,
        folderId: folderId || null, // If folderId is provided, filter by it, otherwise get root documents
      },
      include: {
        folder: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(documents);
  } catch (error) {
    console.error("Error fetching documents:", error);
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

    const { name, type, size, content, url, key, bucket, folderId } =
      await request.json();

    // Validate required fields
    if (!name || !type || !size) {
      return NextResponse.json(
        { error: "Missing required fields: name, type, size" },
        { status: 400 }
      );
    }

    // Simulate AI analysis
    const mockAnalysis = {
      summary: `This document appears to be a ${
        type.includes("pdf")
          ? "PDF report"
          : type.includes("word")
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

    const document = await prisma.document.create({
      data: {
        name,
        type,
        size,
        content: content || "",
        url,
        key,
        bucket,
        folderId: folderId || null,
        summary: mockAnalysis.summary,
        keyPoints: mockAnalysis.keyPoints,
        sentiment: mockAnalysis.sentiment,
        topics: mockAnalysis.topics,
        userId: (session.user as any).id,
      },
      include: {
        folder: true,
      },
    });

    return NextResponse.json(document);
  } catch (error) {
    console.error("Error creating document:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
