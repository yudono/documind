import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { generateChatCompletion, generateDocument } from '@/lib/groq'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { message, context, documentRequest } = body

    if (!message) {
      return NextResponse.json({ error: 'Message is required' }, { status: 400 })
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
      const messages = [
        {
          role: 'system' as const,
          content: 'You are a helpful AI assistant specialized in document creation and analysis. Provide clear, concise, and helpful responses.'
        },
        ...(context ? [{ role: 'user' as const, content: `Context: ${context}` }] : []),
        { role: 'user' as const, content: message }
      ]

      response = await generateChatCompletion(messages)
    }

    return NextResponse.json({
      success: true,
      response,
      documentFile,
      timestamp: new Date().toISOString(),
      userId: (session.user as any).id,
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