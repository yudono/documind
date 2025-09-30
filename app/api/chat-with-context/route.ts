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
      include: {
        userCredit: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { message, sessionId, useSemanticSearch = false, documentIds } = await request.json();

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 });
    }

    // Check credit balance and consume credits
    let userCredit = user.userCredit;
    if (!userCredit) {
      // Initialize user credit if it doesn't exist
      userCredit = await prisma.userCredit.create({
        data: {
          userId: user.id,
          balance: 500, // Default daily credits for free plan
          dailyLimit: 500,
          lastResetDate: new Date(),
        },
      });
    }

    if (userCredit.balance < 1) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 400 }
      );
    }

    // Consume 1 credit for the chat request
    await prisma.$transaction([
      prisma.userCredit.update({
        where: { userId: user.id },
        data: {
          balance: { decrement: 1 },
          totalSpent: { increment: 1 },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          type: 'spend',
          amount: -1,
          description: 'Chat with context',
          reference: sessionId || `context_chat_${Date.now()}`,
        },
      }),
    ]);

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

    // Get updated credit balance
    const updatedCredit = await prisma.userCredit.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      response: result.response,
      referencedDocuments: result.referencedDocuments,
      documentFile: result.documentFile,
      creditBalance: updatedCredit?.balance || 0,
    });

  } catch (error) {
    console.error('Error in chat-with-context:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}