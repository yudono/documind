import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/chat-sessions - Get all chat sessions for the user
// Supports query params: ?documentId=xxx&type=xxx
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
    const type = searchParams.get('type');

    // Build where clause based on query params
    const whereClause: any = { userId: user.id };
    if (documentId) {
      whereClause.documentId = documentId;
    }
    if (type) {
      whereClause.type = type;
    }

    const chatSessions = await prisma.chatSession.findMany({
      where: whereClause,
      include: {
        messages: {
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return NextResponse.json({ chatSessions });
  } catch (error) {
    console.error('Error fetching chat sessions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/chat-sessions - Create a new chat session
// Supports documentId and type for document-specific sessions
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

    const { title, documentId, type } = await request.json();

    if (!title || typeof title !== 'string') {
      return NextResponse.json(
        { error: 'Title is required and must be a string' },
        { status: 400 }
      );
    }

    // If documentId is provided, verify it exists and belongs to the user
    if (documentId) {
      const document = await prisma.item.findFirst({
        where: {
          id: documentId,
          userId: user.id,
          type: 'document',
        },
      });

      if (!document) {
        return NextResponse.json(
          { error: 'Document not found or access denied' },
          { status: 404 }
        );
      }
    }

    // Build data object conditionally to avoid passing unknown fields as null
    const data: any = {
      title,
      userId: user.id,
    };
    if (typeof type === 'string' && type.trim()) {
      data.type = type;
    }
    if (typeof documentId === 'string' && documentId.trim()) {
      data.documentId = documentId;
    }

    const chatSession = await prisma.chatSession.create({
      data,
      include: {
        messages: true,
      },
    });

    return NextResponse.json({ chatSession });
  } catch (error: any) {
    console.error('Error creating chat session:', error?.message || error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}