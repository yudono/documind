import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  generateChatCompletion,
  generateChatCompletionWithAgent,
  generateDocument,
} from "@/lib/groq";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userCredit: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { message, context, documentRequest, sessionId } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
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
          { error: "Chat session not found" },
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
        { error: "Insufficient credits" },
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
          type: "spend",
          amount: -1,
          description: "Chat completion",
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

    let response: string;
    let documentFile: any = null;

    // Always use the agent for processing - let the agent decide whether to generate documents
    let messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      {
        role: "system" as const,
        content:
          "You are a helpful AI assistant specialized in document creation and analysis. Provide clear, concise, and helpful responses.",
      },
      ...(context
        ? [{ role: "user" as const, content: `Context: ${context}` }]
        : []),
      { role: "user" as const, content: message },
    ];

    // If sessionId is provided, get previous messages for context
    if (sessionId) {
      const previousMessages = await prisma.chatMessage.findMany({
        where: { sessionId: sessionId },
        orderBy: { createdAt: "asc" },
        take: 10, // Limit to last 10 messages for context
      });

      messages = [
        {
          role: "system" as const,
          content:
            "You are a helpful AI assistant specialized in document creation and analysis. Provide clear, concise, and helpful responses.",
        },
        ...(context
          ? [{ role: "user" as const, content: `Context: ${context}` }]
          : []),
        ...previousMessages.slice(-9).map((msg: any) => ({
          role: msg.role as "user" | "assistant",
          content: msg.content,
        })),
        { role: "user" as const, content: message },
      ];
    }

    const agentResponse = await generateChatCompletionWithAgent(messages, {
      userId: user.id,
      sessionId: sessionId,
      useSemanticSearch: false,
      documentIds: context ? [] : undefined,
      conversationContext: context,
    });

    // Handle different response types from the agent
    if (typeof agentResponse === "string") {
      response = agentResponse;
    } else {
      response = agentResponse.response;
      if (agentResponse.documentFile) {
        try {
          // Validate buffer size (limit to 10MB for data URLs)
          const bufferSize = agentResponse.documentFile.buffer.length;
          console.log(`PDF buffer size: ${bufferSize} bytes`);

          if (bufferSize > 10 * 1024 * 1024) {
            throw new Error("PDF file too large for data URL");
          }

          // Convert PDF buffer to base64 data URL for download
          const base64Data =
            agentResponse.documentFile.buffer.toString("base64");

          // Validate base64 encoding
          if (!base64Data || base64Data.length === 0) {
            throw new Error("Failed to encode PDF to base64");
          }

          documentFile = {
            name: agentResponse.documentFile.filename,
            type: agentResponse.documentFile.mimeType,
            size: bufferSize,
            url: `data:${agentResponse.documentFile.mimeType};base64,${base64Data}`,
            generatedAt: new Date().toISOString(),
          };

          console.log(
            `PDF document created: ${agentResponse.documentFile.filename}, size: ${bufferSize} bytes`
          );
        } catch (error) {
          console.error("Error processing PDF document:", error);
          // Return error information instead of failing silently
          documentFile = {
            name: agentResponse.documentFile.filename,
            type: agentResponse.documentFile.mimeType,
            size: agentResponse.documentFile.buffer.length,
            url: null,
            error: "Failed to process PDF for download",
            generatedAt: new Date().toISOString(),
          };
        }
      }
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
    });
  } catch (error) {
    console.error("Chat API error:", error);

    // Handle specific Groq API errors
    if (error instanceof Error) {
      if (error.message.includes("rate limit")) {
        return NextResponse.json(
          { error: "Rate limit exceeded. Please try again in a moment." },
          { status: 429 }
        );
      }
      if (error.message.includes("context length")) {
        return NextResponse.json(
          { error: "Message too long. Please try a shorter message." },
          { status: 400 }
        );
      }
    }

    return NextResponse.json(
      { error: "Failed to process chat message" },
      { status: 500 }
    );
  }
}

// Handle OPTIONS for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
