import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { parseDocument } from '@/lib/document-parser';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
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

    const documentId = params.id;

    // Get the document from database
    const document = await prisma.document.findFirst({
      where: {
        id: documentId,
        userId: user.id,
      },
    });

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    // If document has a URL (S3), fetch and parse it
    if (document.url) {
      try {
        const response = await fetch(document.url);
        if (!response.ok) {
          throw new Error('Failed to fetch document from storage');
        }

        const arrayBuffer = await response.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Parse the document
        const parsedDocument = await parseDocument(buffer, document.type, document.name);

        // Update document with parsed content and analysis
        const analysis = {
          summary: `Analysis of ${document.name}: This document contains ${parsedDocument.metadata?.wordCount || 'unknown'} words${parsedDocument.metadata?.pages ? ` across ${parsedDocument.metadata.pages} pages` : ''}. The content appears to be ${getDocumentCategory(document.type, parsedDocument.text)}.`,
          keyPoints: extractKeyPoints(parsedDocument.text),
          sentiment: analyzeSentiment(parsedDocument.text),
          topics: extractTopics(parsedDocument.text),
          wordCount: parsedDocument.metadata?.wordCount || 0,
          pages: parsedDocument.metadata?.pages || 1,
        };

        // Update document in database with analysis
        await prisma.document.update({
          where: { id: documentId },
          data: {
            content: parsedDocument.text,
            summary: analysis.summary,
            keyPoints: JSON.stringify(analysis.keyPoints),
            sentiment: analysis.sentiment,
            topics: JSON.stringify(analysis.topics),
          },
        });

        return NextResponse.json({
          success: true,
          analysis,
          extractedText: parsedDocument.text,
        });

      } catch (parseError) {
        console.error('Document parsing error:', parseError);
        return NextResponse.json(
          { error: 'Failed to parse document' },
          { status: 500 }
        );
      }
    } else {
      // If no URL, return existing analysis or create basic analysis
      const analysis = {
        summary: document.summary || `Basic analysis of ${document.name}`,
        keyPoints: document.keyPoints ? JSON.parse(document.keyPoints) : [],
        sentiment: document.sentiment || 'neutral',
        topics: document.topics ? JSON.parse(document.topics) : [],
        wordCount: 0,
        pages: 1,
      };

      return NextResponse.json({
        success: true,
        analysis,
        extractedText: document.content || '',
      });
    }

  } catch (error) {
    console.error('Document analysis error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Helper functions for analysis
function getDocumentCategory(type: string, text: string): string {
  if (type.includes('pdf')) return 'a PDF document';
  if (type.includes('word')) return 'a Word document';
  if (type.includes('excel') || type.includes('spreadsheet')) return 'a spreadsheet';
  if (type.includes('presentation')) return 'a presentation';
  return 'a document';
}

function extractKeyPoints(text: string): string[] {
  // Simple key point extraction - in production, use NLP libraries
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 20);
  const keyPoints = sentences
    .slice(0, 5)
    .map(s => s.trim())
    .filter(s => s.length > 0);
  
  return keyPoints.length > 0 ? keyPoints : [
    'Document content analysis completed',
    'Key information extracted and processed',
    'Content ready for AI-powered queries'
  ];
}

function analyzeSentiment(text: string): 'positive' | 'neutral' | 'negative' {
  // Simple sentiment analysis - in production, use proper NLP
  const positiveWords = ['good', 'great', 'excellent', 'positive', 'success', 'benefit'];
  const negativeWords = ['bad', 'poor', 'negative', 'problem', 'issue', 'fail'];
  
  const lowerText = text.toLowerCase();
  const positiveCount = positiveWords.filter(word => lowerText.includes(word)).length;
  const negativeCount = negativeWords.filter(word => lowerText.includes(word)).length;
  
  if (positiveCount > negativeCount) return 'positive';
  if (negativeCount > positiveCount) return 'negative';
  return 'neutral';
}

function extractTopics(text: string): string[] {
  // Simple topic extraction - in production, use proper NLP
  const commonTopics = [
    'Business Strategy', 'Financial Planning', 'Market Analysis',
    'Operations', 'Technology', 'Human Resources', 'Legal',
    'Marketing', 'Sales', 'Customer Service'
  ];
  
  const lowerText = text.toLowerCase();
  const detectedTopics = commonTopics.filter(topic => 
    lowerText.includes(topic.toLowerCase()) || 
    topic.split(' ').some(word => lowerText.includes(word.toLowerCase()))
  );
  
  return detectedTopics.length > 0 ? detectedTopics.slice(0, 3) : ['General Business'];
}