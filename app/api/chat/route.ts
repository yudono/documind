import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateChatCompletion, generateDocument } from '@/lib/groq'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
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

    const body = await request.json()
    const { message, context, documentRequest, sessionId } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
    }

    // Verify the chat session exists and belongs to the user if sessionId is provided
    let chatSession = null;
    if (sessionId) {
      chatSession = await prisma.chatSession.findFirst({
        where: {
          id: sessionId,
          userId: user.id,
        },
      });

      if (!chatSession) {
        return NextResponse.json(
          { error: 'Chat session not found' },
          { status: 404 }
        );
      }
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
          description: 'Chat completion',
          reference: `chat_${Date.now()}`,
        },
      }),
    ]);

    // Save user message to session if sessionId is provided
    let userMessage = null;
    if (sessionId) {
      userMessage = await prisma.chatMessage.create({
        data: {
          content: message,
          role: "user",
          sessionId: sessionId,
        },
      });
    }

    // Check if this is a document generation request
    const isDocumentRequest = documentRequest || 
      message.toLowerCase().includes('generate document') ||
      message.toLowerCase().includes('buat dokumen') ||
      message.toLowerCase().includes('create document') ||
      message.toLowerCase().includes('buatkan dokumen')

    let response: string
    let documentFile: any = null

    if (isDocumentRequest) {
      // Generate document using Groq AI
      const documentContent = await generateDocument(message, context)
      
      // Create a mock document file response
      documentFile = {
        name: `Generated_Document_${Date.now()}.docx`,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: Math.floor(Math.random() * 50000) + 10000, // Random size between 10KB-60KB
        url: '#', // In a real implementation, this would be the S3 URL
        content: documentContent,
        generatedAt: new Date().toISOString()
      }

      response = `I've generated a document based on your request. The document contains:\n\n${documentContent.substring(0, 200)}...\n\nYou can download the complete document using the button below.`
    } else {
      // Regular chat completion using Groq AI
      let messages: Array<{role: 'system' | 'user' | 'assistant', content: string}> = [
        {
          role: 'system' as const,
          content: 'You are a helpful AI assistant specialized in document creation and analysis. Provide clear, concise, and helpful responses.'
        },
        ...(context ? [{ role: 'user' as const, content: `Context: ${context}` }] : []),
        { role: 'user' as const, content: message }
      ]

      // If sessionId is provided, get previous messages for context
      if (sessionId) {
        const previousMessages = await prisma.chatMessage.findMany({
          where: { sessionId: sessionId },
          orderBy: { createdAt: "asc" },
          take: 10, // Limit to last 10 messages for context
        });

        messages = [
          {
            role: 'system' as const,
            content: 'You are a helpful AI assistant specialized in document creation and analysis. Provide clear, concise, and helpful responses.'
          },
          ...(context ? [{ role: 'user' as const, content: `Context: ${context}` }] : []),
          ...previousMessages.slice(-9).map((msg: any) => ({
            role: msg.role as "user" | "assistant",
            content: msg.content,
          })),
          { role: 'user' as const, content: message }
        ]
      }

      response = await generateChatCompletion(messages)
    }

    // Save AI response to session if sessionId is provided
    let assistantMessage = null;
    if (sessionId) {
      assistantMessage = await prisma.chatMessage.create({
        data: {
          content: response,
          role: "assistant",
          sessionId: sessionId,
        },
      });

      // Update chat session timestamp
      await prisma.chatSession.update({
        where: { id: sessionId },
        data: {
          updatedAt: new Date(),
        },
      });
    }

    // Get updated credit balance
    const updatedCredit = await prisma.userCredit.findUnique({
      where: { userId: user.id },
    });

    return NextResponse.json({
      success: true,
      response,
      documentFile,
      timestamp: new Date().toISOString(),
      userId: user.id,
      creditBalance: updatedCredit?.balance || 0,
      messageId: assistantMessage?.id,
    })

  } catch (error) {
    console.error('Chat API error:', error)
    
    // Handle specific Groq API errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again in a moment.' },
          { status: 429 }
        )
      }
      if (error.message.includes('context length')) {
        return NextResponse.json(
          { error: 'Message too long. Please try a shorter message.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to process chat message' },
      { status: 500 }
    )
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}