import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { milvusService } from "@/lib/milvus";

// POST /api/embeddings - Generate and store embeddings for a document
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

    const { documentId, text } = await request.json();

    if (!documentId || !text) {
      return NextResponse.json(
        { error: "documentId and text are required" },
        { status: 400 }
      );
    }

    // Verify the document belongs to the user
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    // Delete existing embeddings for this document
    if (milvusService) {
      await milvusService.deleteDocumentChunks(documentId, user.id);

      // Process and insert new document chunks
      const result = await milvusService.processAndInsertDocument(
        documentId,
        text,
        user.id
      );

      return NextResponse.json({
        message: "Embeddings generated successfully",
        chunksCount: result.chunksCount,
      });
    } else {
      return NextResponse.json(
        {
          error: "Vector database not configured",
        },
        { status: 503 }
      );
    }
  } catch (error) {
    console.error("Error generating embeddings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/embeddings?documentId=xxx - Get embeddings for a document
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get("documentId");

    if (!documentId) {
      return NextResponse.json(
        { error: "documentId is required" },
        { status: 400 }
      );
    }

    // Verify the document belongs to the user
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id,
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    if (!milvusService) {
      return NextResponse.json(
        { error: "Vector database not configured" },
        { status: 503 }
      );
    }

    const embeddings = await milvusService.searchSimilarChunks(
      [],
      user.id,
      1000,
      [documentId]
    );

    return NextResponse.json({
      embeddings: embeddings.map((chunk) => ({
        id: chunk.id,
        documentId: chunk.documentId,
        chunkText: chunk.chunkText,
        chunkIndex: chunk.chunkIndex,
        similarity: chunk.similarity,
      })),
    });
  } catch (error) {
    console.error("Error fetching embeddings:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
