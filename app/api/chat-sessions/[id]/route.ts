import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { milvusService, initializeMilvus } from "@/lib/milvus";

// DELETE /api/chat-sessions/[id] - Delete a specific chat session and its data
export async function DELETE(
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

    const chatSession = await prisma.chatSession.findFirst({
      where: { id: params.id, userId: user.id },
    });

    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found" }, { status: 404 });
    }

    // Delete Milvus memory chunks for this session
    try {
      if (milvusService) {
        await initializeMilvus();
        await milvusService.deleteDocumentChunks(params.id, user.id);
      }
    } catch (e) {
      console.warn("Milvus cleanup failed for session", params.id, e);
    }

    // Finally, delete the chat session (messages cascade via Prisma)
    await prisma.chatSession.delete({
      where: { id: params.id },
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