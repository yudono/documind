import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { generateChatMessageEmbedding } from '@/lib/chat-embeddings';

// POST /api/chat-messages - Add a message to a chat session
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

    const { sessionId, content, role, referencedDocs } = await request.json();

    if (!sessionId || !content || !role) {
      return NextResponse.json(
        { error: 'sessionId, content, and role are required' },
        { status: 400 }
      );
    }

    if (!['user', 'assistant'].includes(role)) {
      return NextResponse.json(
        { error: 'Role must be either "user" or "assistant"' },
        { status: 400 }
      );
    }

    // Verify the chat session belongs to the user
    const chatSession = await prisma.chatSession.findFirst({
      where: { 
        id: sessionId,
        userId: user.id,
      },
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    // Consume credits for user messages
    if (role === 'user') {
      // Check user's credit balance
      const userCredit = await prisma.userCredit.findUnique({
        where: { userId: user.id },
      });

      if (!userCredit || userCredit.balance < 1) {
        return NextResponse.json(
          { error: 'Insufficient credits' },
          { status: 400 }
        );
      }

      // Consume 1 credit for the message
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
            description: 'Chat message',
            reference: sessionId,
          },
        }),
      ]);
    }

    const message = await prisma.chatMessage.create({
      data: {
        content,
        role,
        sessionId,
        referencedDocs: referencedDocs || [],
      },
    });

    // Generate embedding for the message (async, don't wait)
    generateChatMessageEmbedding(message.id, content).catch(error => {
      console.error('Failed to generate embedding for message:', error);
    });

    // Update the chat session's updatedAt timestamp
    await prisma.chatSession.update({
      where: { id: sessionId },
      data: { updatedAt: new Date() },
    });

    return NextResponse.json({ message });
  } catch (error) {
    console.error('Error creating chat message:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET /api/chat-messages?sessionId=xxx - Get messages for a chat session
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
    const sessionId = searchParams.get('sessionId');

    if (!sessionId) {
      return NextResponse.json(
        { error: 'sessionId is required' },
        { status: 400 }
      );
    }

    // Verify the chat session belongs to the user
    const chatSession = await prisma.chatSession.findFirst({
      where: { 
        id: sessionId,
        userId: user.id,
      },
    });

    if (!chatSession) {
      return NextResponse.json({ error: 'Chat session not found' }, { status: 404 });
    }

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });

    // Attach documentFile metadata for assistant messages referencing generated documents
    const messagesWithFiles = await Promise.all(
      messages.map(async (msg) => {
        if (msg.role === 'assistant' && Array.isArray(msg.referencedDocs) && msg.referencedDocs.length > 0) {
          const docId = msg.referencedDocs[0];
          try {
            const item = await prisma.item.findFirst({
              where: { id: docId, userId: user.id, type: 'document' },
            });
            if (item) {
              const isPdfDefault = true; // default to pdf
              const url = `/api/documents/${item.id}/download?type=${isPdfDefault ? 'pdf' : 'docx'}`;
              return {
                ...msg,
                documentFile: {
                  name: `${item.name}.pdf`,
                  type: item.fileType || 'application/pdf',
                  downloadUrl: url,
                  url,
                },
              };
            }
          } catch (e) {
            console.warn('Failed to attach document to message', e);
          }
        }
        return msg;
      })
    );

    return NextResponse.json({ messages: messagesWithFiles });
  } catch (error) {
    console.error('Error fetching chat messages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}