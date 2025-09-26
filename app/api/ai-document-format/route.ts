import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { DocumentFormatParser } from '@/lib/document-format-parser';
import { AIDocumentFormatter } from '@/lib/ai-document-formatter';
import { prisma } from '@/lib/prisma';

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

    const { 
      content, 
      formatType = 'auto',
      parsingOptions = {},
      metadata = {}
    } = await request.json();

    if (!content) {
      return NextResponse.json({ 
        error: 'Content is required' 
      }, { status: 400 });
    }

    const aiFormatter = new AIDocumentFormatter();
    const parser = new DocumentFormatParser(parsingOptions);

    let result;

    switch (formatType) {
      case 'ai-format':
        // Use AI to format the content
        result = {
          formattedContent: await aiFormatter.format(content),
          type: 'formatted-text'
        };
        break;

      case 'parse-markdown':
        // Parse markdown into structured format
        result = {
          parsedDocument: parser.parseMarkdown(content, metadata),
          type: 'parsed-document'
        };
        break;

      case 'parse-json':
        // Parse JSON document structure
        result = {
          parsedDocument: parser.parseJSON(content),
          type: 'parsed-document'
        };
        break;

      case 'parse-plain':
        // Parse plain text
        result = {
          parsedDocument: parser.parsePlainText(content, metadata),
          type: 'parsed-document'
        };
        break;

      case 'auto':
      default:
        // Auto-detect and parse
        const parsedDoc = parser.parse(content, metadata);
        const formattedContent = await aiFormatter.format(content);
        
        result = {
          parsedDocument: parsedDoc,
          formattedContent,
          type: 'complete'
        };
        break;
    }

    return NextResponse.json({
      success: true,
      data: result
    });

  } catch (error) {
    console.error('Error formatting document:', error);
    return NextResponse.json(
      { 
        error: 'Failed to format document',
        details: error instanceof Error ? error.message : 'Unknown error'
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
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json({
      success: true,
      data: {
        supportedFormats: ['ai-format', 'parse-markdown', 'parse-json', 'parse-plain', 'auto'],
        defaultParsingOptions: {
          preserveFormatting: true,
          extractTables: true,
          extractLists: true,
          extractImages: false,
          defaultFontSize: 12,
          defaultAlignment: 'left'
        },
        capabilities: {
          aiFormatting: true,
          markdownParsing: true,
          jsonParsing: true,
          plainTextParsing: true,
          autoDetection: true,
          structuredOutput: true
        }
      }
    });

  } catch (error) {
    console.error('Error retrieving formatting options:', error);
    return NextResponse.json(
      { error: 'Failed to retrieve formatting options' },
      { status: 500 }
    );
  }
}