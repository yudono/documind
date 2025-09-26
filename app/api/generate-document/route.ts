import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { documentGenerator, DocumentGenerationOptions } from '@/lib/document-generator';
import { enhancedPDFGenerator, EnhancedPDFOptions } from '@/lib/enhanced-pdf-generator';
import { documentFormatParser } from '@/lib/document-format-parser';
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
      format, 
      title, 
      author, 
      subject, 
      keywords, 
      data, 
      template,
      useAIFormatting = true,
      fontSize,
      fontFamily,
      margins,
      pageSize,
      orientation,
      includeHeader,
      includeFooter,
      headerText,
      footerText
    } = await request.json();

    if (!content || !format) {
      return NextResponse.json({ 
        error: 'Content and format are required' 
      }, { status: 400 });
    }

    let result: Buffer | string;

    // Use enhanced PDF generator for PDF format with AI formatting
    if (format === 'pdf' && useAIFormatting) {
      const enhancedOptions: EnhancedPDFOptions = {
        title: title || 'Generated Document',
        author: author || user.name || 'Document Assistant',
        subject,
        keywords,
        content,
        useAIFormatting: true,
        fontSize,
        fontFamily,
        margins,
        pageSize,
        orientation,
        includeHeader,
        includeFooter,
        headerText,
        footerText
      };

      result = await enhancedPDFGenerator.generatePDF(enhancedOptions);
    } else {
      // Use original document generator for other formats or non-AI PDF
      const options: DocumentGenerationOptions = {
        content,
        format,
        title: title || 'Generated Document',
        author: author || user.name || 'Document Assistant',
        subject,
        keywords,
        data,
        template: template || 'report'
      };

      result = await documentGenerator.generate(options);
    }

    if (format === 'html') {
      return new NextResponse(result as string, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="${title || 'document'}.html"`
        }
      });
    }

    const buffer = result as Buffer;
    const mimeTypes = {
      pdf: 'application/pdf',
      excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const fileExtensions = {
      pdf: 'pdf',
      excel: 'xlsx',
    };

    return new NextResponse(buffer, {
      headers: {
        'Content-Type': mimeTypes[format as keyof typeof mimeTypes],
        'Content-Disposition': `attachment; filename="${title || 'document'}.${fileExtensions[format as keyof typeof fileExtensions]}"`
      }
    });

  } catch (error) {
    console.error('Error generating document:', error);
    return NextResponse.json(
      { error: 'Failed to generate document' },
      { status: 500 }
    );
  }
}