import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { generateChatCompletion } from "@/lib/groq";

// POST /api/chat-sessions/[id]/messages - Send a message to a chat session
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const { content, templateId } = await request.json();

    if (!content) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Verify the chat session exists and belongs to the user
    const chatSession = await prisma.chatSession.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
    });

    if (!chatSession) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      );
    }

    // Save user message
    const userMessage = await prisma.chatMessage.create({
      data: {
        content: content,
        role: "user",
        sessionId: params.id,
      },
    });

    // Get template context if templateId is provided
    let templateContext = "";
    if (templateId) {
      const template = await prisma.template.findUnique({
        where: { id: templateId },
      });

      if (template) {
        templateContext = `You are helping with a document template: "${template.name}". Description: ${template.description}. Please provide assistance related to this template.`;
      }
    }

    // Get previous messages for context
    const previousMessages = await prisma.chatMessage.findMany({
      where: { sessionId: params.id },
      orderBy: { createdAt: "asc" },
      take: 10, // Limit to last 10 messages for context
    });

    // Prepare messages for Groq
    const groqMessages = [
      {
        role: "system" as const,
        content:
          templateContext ||
          "You are a helpful AI assistant for document management and analysis.",
      },
      ...previousMessages.slice(-9).map((msg: any) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      })),
      {
        role: "user" as const,
        content: content,
      },
    ];

    // Get AI response using Groq
    const aiResponse = await generateChatCompletion(groqMessages, {
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
      max_tokens: 1000,
    });

    // Save AI response
    const assistantMessage = await prisma.chatMessage.create({
      data: {
        content: aiResponse,
        role: "assistant",
        sessionId: params.id,
      },
    });

    // Update chat session timestamp
    await prisma.chatSession.update({
      where: { id: params.id },
      data: {
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      id: assistantMessage.id,
      content: assistantMessage.content,
      role: assistantMessage.role,
      timestamp: assistantMessage.createdAt,
    });
  } catch (error) {
    console.error("Error sending message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
