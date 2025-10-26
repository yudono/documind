import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { generateChatWithAgent } from "@/lib/groq";
import { prisma } from "@/lib/prisma";
import { milvusService, initializeMilvus } from "@/lib/milvus";

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
    const {
      message,
      context,
      documentRequest,
      sessionId,
      type,
      referencedDocs,
      action,
      title,
    } = body;
    let currentSessionId = sessionId as string | undefined;

    // New: allow creating a chat session without sending a message
    if (action === "createSession") {
      const defaultTitle =
        typeof title === "string" && title ? title : "New Chat";
      const createdSession = await prisma.chatSession.create({
        data: {
          title: defaultTitle,
          userId: user.id,
          type: type || "chat",
        },
        include: {
          messages: {
            orderBy: { createdAt: "asc" },
          },
        },
      });

      // Return the newly created session
      return NextResponse.json({ chatSession: createdSession });
    }

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Verify the chat session exists and belongs to the user if sessionId is provided
    let chatSession = null;
    if (currentSessionId) {
      chatSession = await prisma.chatSession.findFirst({
        where: {
          id: currentSessionId,
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
          dailyLimit: 500,
          dailyUsed: 0,
          lastResetDate: new Date(),
        },
      });
    }

    const availableToday = Math.max(0, (userCredit.dailyLimit || 0) - (userCredit.dailyUsed || 0));
    if (availableToday < 1) {
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
          dailyUsed: { increment: 1 },
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

    // Ensure chat session exists; auto-create if none provided
    if (!currentSessionId) {
      const defaultTitle = "New Chat";
      const createdSession = await prisma.chatSession.create({
        data: {
          title: defaultTitle,
          userId: user.id,
          type: type || "chat",
        },
      });
      // use created session for downstream operations
      currentSessionId = createdSession.id;
    }

    // Prepare referenced docs as objects { name, url }
    const referencedDocObjects =
      referencedDocs && Array.isArray(referencedDocs)
        ? referencedDocs.filter((d: any) => d && typeof d === "object")
        : [];

    // Persist the user's message so linked resources survive refresh
    const createdUserMessage = await prisma.chatMessage.create({
      data: {
        content: message,
        role: "user",
        sessionId: currentSessionId!,
        referencedDocs: referencedDocObjects as any,
      },
    });

    let response: string;
    let documentFile: any = null;
    let generatedItemId: string | undefined;

    // Build conversation context from provided document context + recent session messages
    let conversationContext = "";
    try {
      const prefix =
        context && typeof context === "string" && context.trim().length
          ? `Provided context:\n${context.trim()}\n\n`
          : "";

      if (currentSessionId) {
        const messages = await prisma.chatMessage.findMany({
          where: { sessionId: currentSessionId },
          orderBy: { createdAt: "asc" },
          select: { role: true, content: true },
        });
        const last = messages.slice(Math.max(0, messages.length - 12));
        const transcript = last
          .map(
            (m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`
          )
          .join("\n");
        const combined = `${prefix}${transcript}`;
        // Cap transcript length to avoid overly long prompts
        conversationContext =
          combined.length > 4000 ? combined.slice(-4000) : combined;
      } else {
        conversationContext = prefix;
      }
    } catch (e) {
      console.warn("Failed to build conversation context", e);
      conversationContext = context || "";
    }

    const agentResponse = await generateChatWithAgent(
      message,
      user.id,
      currentSessionId,
      true,
      currentSessionId ? [currentSessionId] : undefined,
      conversationContext,
      referencedDocs
    );

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

          // Persist generated document content as Item so download link remains stable
          const safeName = (
            agentResponse.documentFile.filename || "AI_Generated_Document"
          ).replace(/\.pdf$|\.docx$/i, "");
          const createdItem = await prisma.item.create({
            data: {
              name: safeName,
              type: "document",
              userId: user.id,
              fileType: agentResponse.documentFile.mimeType,
              size: bufferSize,
              content: JSON.stringify({ html: response }),
            },
          });

          // Build stable download URL via documents download route
          const isPdf =
            agentResponse.documentFile.mimeType === "application/pdf";
          const downloadUrl = `/api/items/${createdItem.id}/download?type=${
            isPdf ? "pdf" : "docx"
          }`;

          documentFile = {
            name: `${safeName}.${isPdf ? "pdf" : "docx"}`,
            type: agentResponse.documentFile.mimeType,
            size: bufferSize,
            url: downloadUrl,
            generatedAt: new Date().toISOString(),
          };

          console.log(
            `Document persisted: ${safeName} (Item ID: ${createdItem.id}), size: ${bufferSize} bytes`
          );

          // Track the generated item id for attaching to assistant message
          generatedItemId = createdItem.id;

          // Replace assistant response with a friendly, non-HTML status message
          response = `✅ Dokumen berhasil dibuat. Gunakan tombol download untuk mengunduh.`;
        } catch (error) {
          console.error("Error processing generated document:", error);
          documentFile = {
            name: agentResponse.documentFile.filename,
            type: agentResponse.documentFile.mimeType,
            size: agentResponse.documentFile.buffer.length,
            url: null,
            error: "Failed to persist document for download",
            generatedAt: new Date().toISOString(),
          };
          // Fallback text response
          response = `❌ Gagal menyimpan dokumen untuk diunduh. Coba lagi.`;
        }
      }
    }

    // Persist AI assistant response with referenced generated document (if any)
    const assistantReferencedDocs =
      documentFile?.url && documentFile?.name
        ? [{ name: documentFile.name, url: documentFile.url }]
        : [];

    const assistantMessage = await prisma.chatMessage.create({
      data: {
        content: response,
        role: "assistant",
        sessionId: currentSessionId!,
        referencedDocs: assistantReferencedDocs as any,
      },
    });

    // Update chat session timestamp
    await prisma.chatSession.update({
      where: { id: currentSessionId },
      data: {
        updatedAt: new Date(),
      },
    });

    // Get updated credit balance
    const updatedCredit = await prisma.userCredit.findUnique({
      where: { userId: user.id },
    });

    const creditBalance = Math.max(0, (updatedCredit?.dailyLimit || 0) - (updatedCredit?.dailyUsed || 0));

    return NextResponse.json({
      success: true,
      response,
      documentFile,
      timestamp: new Date().toISOString(),
      userId: user.id,
      creditBalance,
      messageId: assistantMessage?.id,
      sessionId: currentSessionId,
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

// GET: If sessionId is provided, return messages; otherwise return sessions list
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
    const sessionId = searchParams.get("sessionId");

    // If sessionId present, return messages for that session
    if (sessionId) {
      // Verify the chat session belongs to the user
      const chatSession = await prisma.chatSession.findFirst({
        where: { id: sessionId, userId: user.id },
      });

      if (!chatSession) {
        return NextResponse.json(
          { error: "Chat session not found" },
          { status: 404 }
        );
      }

      const messages = await prisma.chatMessage.findMany({
        where: { sessionId },
        orderBy: { createdAt: "asc" },
      });

      // Attach documentFile metadata for assistant messages referencing generated documents
      const messagesWithFiles = await Promise.all(
        messages.map(async (msg) => {
          if (
            msg.role === "assistant" &&
            Array.isArray((msg as any).referencedDocs) &&
            (msg as any).referencedDocs.length > 0
          ) {
            const ref = (msg as any).referencedDocs[0];
            if (ref && typeof ref === "object" && ref.url) {
              const url = ref.url;
              const name = ref.name || "Document";
              return {
                ...msg,
                documentFile: {
                  name,
                  type: url.includes("type=docx")
                    ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                    : "application/pdf",
                  downloadUrl: url,
                  url,
                },
              };
            }
          }
          return msg;
        })
      );

      return NextResponse.json({
        chatSession: {
          id: chatSession.id,
          title: chatSession.title,
          createdAt: chatSession.createdAt,
          updatedAt: chatSession.updatedAt,
        },
        messages: messagesWithFiles,
      });
    }

    // Otherwise, list sessions for the user; supports optional filters
    const documentId = searchParams.get("documentId");
    const type = searchParams.get("type");

    const whereClause: any = { userId: user.id };
    if (documentId) whereClause.documentId = documentId;
    if (type) whereClause.type = type;

    const chatSessions = await prisma.chatSession.findMany({
      where: whereClause,
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ chatSessions });
  } catch (error) {
    console.error("Error in chat GET:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT: Update session title via ?sessionId=xxx
export async function PUT(request: NextRequest) {
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
    const sessionId = searchParams.get("sessionId");
    const { title } = await request.json();

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    if (!title || typeof title !== "string") {
      return NextResponse.json(
        { error: "Title is required and must be a string" },
        { status: 400 }
      );
    }

    const updatedCount = await prisma.chatSession.updateMany({
      where: { id: sessionId, userId: user.id },
      data: { title },
    });

    if (updatedCount.count === 0) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      );
    }

    const updatedSession = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: user.id },
      include: {
        messages: {
          orderBy: { createdAt: "asc" },
        },
      },
    });

    return NextResponse.json({ chatSession: updatedSession });
  } catch (error) {
    console.error("Error updating chat session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE: Delete a session via ?sessionId=xxx
export async function DELETE(request: NextRequest) {
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
    const sessionId = searchParams.get("sessionId");

    if (!sessionId) {
      return NextResponse.json(
        { error: "sessionId is required" },
        { status: 400 }
      );
    }

    // Ensure the session exists and belongs to the user
    const existing = await prisma.chatSession.findFirst({
      where: { id: sessionId, userId: user.id },
    });
    if (!existing) {
      return NextResponse.json(
        { error: "Chat session not found" },
        { status: 404 }
      );
    }

    // Clean up Milvus memory chunks for this session
    try {
      if (milvusService) {
        await initializeMilvus();
        await milvusService.deleteDocumentChunks(sessionId, user.id);
      }
    } catch (e) {
      console.warn("Milvus cleanup failed for session", sessionId, e);
    }

    // Delete the chat session (cascade deletes its messages)
    await prisma.chatSession.delete({
      where: { id: sessionId },
    });

    return NextResponse.json({ message: "Chat session deleted successfully" });
  } catch (error) {
    console.error("Error deleting chat session:", error);
    return NextResponse.json(
      { error: "Internal server error" },
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
