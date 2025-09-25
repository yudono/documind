import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateEmbedding, findSimilarChunks } from '@/lib/embeddings';

// POST /api/search - Semantic search across user's documents
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { query, documentIds, limit = 10, threshold = 0.7 } = await request.json();

    if (!query) {
      return NextResponse.json(
        { error: 'Query is required' },
        { status: 400 }
      );
    }

    // Generate embedding for the search query
    const queryEmbedding = await generateEmbedding(query);

    // Build the where clause for document filtering
    let whereClause: any = {
      document: {
        userId: user.id,
      },
    };

    // If specific document IDs are provided, filter by them
    if (documentIds && Array.isArray(documentIds) && documentIds.length > 0) {
      whereClause.documentId = {
        in: documentIds,
      };
    }

    // Get all embeddings for the user's documents (or specific documents)
    const embeddings = await prisma.documentEmbedding.findMany({
      where: whereClause,
      include: {
        document: {
          select: {
            id: true,
            name: true,
            type: true,
            createdAt: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (embeddings.length === 0) {
      return NextResponse.json({
        results: [],
        message: 'No documents found to search',
      });
    }

    // Find similar chunks using cosine similarity
    const similarChunks = findSimilarChunks(
      queryEmbedding,
      embeddings.map(emb => ({
        id: emb.id,
        embedding: emb.embedding,
        text: emb.chunkText,
        documentId: emb.documentId,
      })),
      limit,
      threshold
    );

    // Get document details for the results
    const documentMap = new Map();
    embeddings.forEach(emb => {
      if (!documentMap.has(emb.documentId)) {
        documentMap.set(emb.documentId, emb.document);
      }
    });

    // Format the results
    const results = similarChunks.map(chunk => {
      const embeddingData = embeddings.find(emb => emb.id === chunk.id);
      return {
        id: chunk.id,
        documentId: chunk.documentId,
        document: {
          id: documentMap.get(chunk.documentId).id,
          name: documentMap.get(chunk.documentId).name,
          type: documentMap.get(chunk.documentId).type,
          createdAt: documentMap.get(chunk.documentId).createdAt,
        },
        chunkText: chunk.text,
        chunkIndex: embeddingData?.chunkIndex || 0,
        similarity: chunk.similarity,
      };
    });

    return NextResponse.json({
      query,
      results,
      totalResults: results.length,
    });
  } catch (error) {
    console.error('Error performing semantic search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/search?q=query&documentIds=id1,id2&limit=10 - Alternative GET endpoint for search
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const documentIdsParam = searchParams.get('documentIds');
    const limitParam = searchParams.get('limit');
    const thresholdParam = searchParams.get('threshold');

    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter "q" is required' },
        { status: 400 }
      );
    }

    const documentIds = documentIdsParam ? documentIdsParam.split(',') : undefined;
    const limit = limitParam ? parseInt(limitParam, 10) : 10;
    const threshold = thresholdParam ? parseFloat(thresholdParam) : 0.7;

    // Use the same logic as POST by creating a mock request body
    const mockBody = { query, documentIds, limit, threshold };
    
    // Create a new request with the parsed parameters
    const mockRequest = new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify(mockBody),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Reuse the POST logic
    return await POST(mockRequest);
  } catch (error) {
    console.error('Error in GET search:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}