import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { parseDocument } from '@/lib/document-parser'
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
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const formData = await request.formData()
    const file = formData.get('file') as File
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer as ArrayBuffer)
    
    // Parse the document
    const parsedDocument = await parseDocument(buffer, file.type, file.name)

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      extractedText: parsedDocument.text,
      metadata: parsedDocument.metadata,
      processedAt: new Date().toISOString(),
      processedBy: user.id,
    })

  } catch (error) {
    console.error('Document parsing error:', error)
    
    // Handle specific parsing errors
    if (error instanceof Error) {
      if (error.message.includes('Unsupported document type')) {
        return NextResponse.json(
          { error: 'Unsupported document type. Please upload PDF, DOCX, XLSX, or PPTX files.' },
          { status: 400 }
        )
      }
      if (error.message.includes('Failed to parse')) {
        return NextResponse.json(
          { error: 'Failed to parse document. The file may be corrupted or password-protected.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to process document' },
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