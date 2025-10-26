import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { DocumentFormatParser } from "@/lib/document-format-parser";
import { AIDocumentFormatter } from "@/lib/ai-document-formatter";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
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

    const {
      content,
      formatType = "auto",
      parsingOptions = {},
      metadata = {},
    } = await request.json();

    if (!content) {
      return NextResponse.json(
        {
          error: "Content is required",
        },
        { status: 400 }
      );
    }

    const aiFormatter = new AIDocumentFormatter();
    const parser = new DocumentFormatParser(parsingOptions);

    let result;

    switch (formatType) {
      case "ai-format":
        // Use AI to format the content
        result = {
          formattedContent: await aiFormatter.format(content),
          type: "formatted-text",
        };
        break;

      case "parse-markdown":
        // Parse markdown into structured format
        result = {
          parsedDocument: parser.parseMarkdown(content, metadata),
          type: "parsed-document",
        };
        break;

      case "parse-json":
        // Parse JSON document structure
        result = {
          parsedDocument: parser.parseJSON(content),
          type: "parsed-document",
        };
        break;

      case "parse-plain":
        // Parse plain text
        result = {
          parsedDocument: parser.parsePlainText(content, metadata),
          type: "parsed-document",
        };
        break;

      case "auto":
      default:
        // Auto-detect and parse
        const parsedDoc = parser.parse(content, metadata);
        const formattedContent = await aiFormatter.format(content);

        result = {
          parsedDocument: parsedDoc,
          formattedContent,
          type: "complete",
        };
        break;
    }

    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("Error formatting document:", error);
    return NextResponse.json(
      {
        error: "Failed to format document",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

// GET endpoint to retrieve formatting options and capabilities
export async function GET(request: NextRequest) {
  try {
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

    // Check credit balance
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

    const availableToday = Math.max(
      0,
      (userCredit.dailyLimit || 0) - (userCredit.dailyUsed || 0)
    );
    if (availableToday < 1) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 400 }
      );
    }

    // Consume 1 credit for the AI document format request
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
          description: "AI document format",
          reference: `ai_format_${Date.now()}`,
        },
      }),
    ]);

    // Get updated credit balance
    const updatedCredit = await prisma.userCredit.findUnique({
      where: { userId: user.id },
    });

    const creditBalance = Math.max(
      0,
      (updatedCredit?.dailyLimit || 0) - (updatedCredit?.dailyUsed || 0)
    );

    return NextResponse.json({
      creditBalance,
    });
  } catch (error) {
    console.error("Error in ai-document-format:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
