import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { milvusService } from "@/lib/milvus";

// POST /api/search - Semantic search across user's documents
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const {
      query,
      documentIds,
      limit = 10,
      threshold = 0.7,
    } = await request.json();

    if (!query) {
      return NextResponse.json({ error: "Query is required" }, { status: 400 });
    }

    if (!milvusService) {
      return NextResponse.json(
        { error: "Vector database not configured" },
        { status: 503 }
      );
    }

    // Perform semantic search using Milvus
    const similarChunks = await milvusService.searchSimilarChunksByText(
      query,
      user.id,
      limit,
      documentIds
    );

    if (similarChunks.length === 0) {
      return NextResponse.json({
        results: [],
        message: "No similar documents found",
      });
    }

    // Get document details for the results
    const documentIds_found = Array.from(
      new Set(similarChunks.map((chunk) => chunk.documentId))
    );
    const documents = await prisma.document.findMany({
      where: {
        id: { in: documentIds_found },
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
        type: true,
        createdAt: true,
      },
    });

    const documentMap = new Map();
    documents.forEach((doc) => {
      documentMap.set(doc.id, doc);
    });

    // Format the results
    const results = similarChunks.map((chunk) => ({
      id: chunk.id,
      documentId: chunk.documentId,
      document: documentMap.get(chunk.documentId),
      chunkText: chunk.chunkText,
      chunkIndex: chunk.chunkIndex,
      similarity: chunk.similarity,
    }));

    return NextResponse.json({
      query,
      results,
      totalResults: results.length,
    });
  } catch (error) {
    console.error("Error performing semantic search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/search?q=query&documentIds=id1,id2&limit=10 - Alternative GET endpoint for search
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get("q");
    const documentIdsParam = searchParams.get("documentIds");
    const limitParam = searchParams.get("limit");
    const thresholdParam = searchParams.get("threshold");

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const documentIds = documentIdsParam
      ? documentIdsParam.split(",")
      : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const threshold = thresholdParam ? parseFloat(thresholdParam) : 0.7;

    if (!milvusService) {
      return NextResponse.json(
        { error: "Vector database not configured" },
        { status: 503 }
      );
    }

    // Use the same logic as POST by creating a mock request body
    const mockBody = { query, documentIds, limit, threshold };

    // Create a new request with the parsed parameters
    const mockRequest = new NextRequest(request.url, {
      method: "POST",
      body: JSON.stringify(mockBody),
      headers: {
        "Content-Type": "application/json",
      },
    });

    // Reuse the POST logic
    return await POST(mockRequest);
  } catch (error) {
    console.error("Error in GET search:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
