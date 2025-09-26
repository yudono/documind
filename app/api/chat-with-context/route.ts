import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { generateChatWithAgent } from '@/lib/groq';
import { prisma } from '@/lib/prisma';
import { getChatContext } from '@/lib/chat-embeddings';

// POST /api/chat-with-context - Chat with document context using semantic search
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

    const { message, sessionId, useSemanticSearch = false, documentIds } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Get conversation context from previous messages if sessionId is provided
    let conversationContext = '';
    if (sessionId && sessionId !== 'current') {
      conversationContext = await getChatContext(message, sessionId, 3);
    }

    // Use the document agent to process the query
    const result = await generateChatWithAgent(
      message,
      user.id,
      sessionId,
      useSemanticSearch,
      documentIds,
      conversationContext
    );

    return NextResponse.json({
      response: result.response,
      referencedDocuments: result.referencedDocuments,
      documentFile: result.documentFile
    });

  } catch (error) {
    console.error('Error in chat-with-context:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}