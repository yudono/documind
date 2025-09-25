import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateEmbedding, splitTextIntoChunks } from '@/lib/embeddings';

// POST /api/embeddings - Generate and store embeddings for a document
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

    const { documentId, text } = await request.json();

    if (!documentId || !text) {
      return NextResponse.json(
        { error: 'documentId and text are required' },
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
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // Delete existing embeddings for this document
    await prisma.documentEmbedding.deleteMany({
      where: { documentId },
    });

    // Split text into chunks
    const chunks = splitTextIntoChunks(text);
    
    if (chunks.length === 0) {
      return NextResponse.json(
        { error: 'No valid text chunks found' },
        { status: 400 }
      );
    }

    // Generate embeddings for each chunk
    const embeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const embedding = await generateEmbedding(chunk);
        
        const documentEmbedding = await prisma.documentEmbedding.create({
          data: {
            documentId,
            chunkText: chunk,
            embedding,
            chunkIndex: i,
          },
        });
        
        embeddings.push(documentEmbedding);
      } catch (error) {
        console.error(`Error generating embedding for chunk ${i}:`, error);
        // Continue with other chunks even if one fails
      }
    }

    return NextResponse.json({ 
      message: 'Embeddings generated successfully',
      embeddingsCount: embeddings.length,
      chunksCount: chunks.length,
    });
  } catch (error) {
    console.error('Error generating embeddings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/embeddings?documentId=xxx - Get embeddings for a document
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');

    if (!documentId) {
      return NextResponse.json(
        { error: 'documentId is required' },
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
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const embeddings = await prisma.documentEmbedding.findMany({
      where: { documentId },
      orderBy: { chunkIndex: 'asc' },
    });

    return NextResponse.json({ embeddings });
  } catch (error) {
    console.error('Error fetching embeddings:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}