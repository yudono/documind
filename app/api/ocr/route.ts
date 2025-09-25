import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { performOCR } from '@/lib/groq'

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions)
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { imageUrl, prompt } = body

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // Validate URL format
    try {
      new URL(imageUrl)
    } catch {
      return NextResponse.json({ error: 'Invalid image URL format' }, { status: 400 })
    }

    // Perform OCR using Groq's vision model
    const extractedText = await performOCR(
      imageUrl,
      prompt || "Extract all text from this image. Provide the text content in a clear, structured format."
    )

    return NextResponse.json({
      success: true,
      extractedText,
      imageUrl,
      processedAt: new Date().toISOString(),
      processedBy: (session.user as any).id,
    })

  } catch (error) {
    console.error('OCR processing error:', error)
    
    // Handle specific Groq API errors
    if (error instanceof Error) {
      if (error.message.includes('rate limit')) {
        return NextResponse.json(
          { error: 'Rate limit exceeded. Please try again later.' },
          { status: 429 }
        )
      }
      if (error.message.includes('invalid image')) {
        return NextResponse.json(
          { error: 'Invalid image format or corrupted image.' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { error: 'Failed to process image for OCR' },
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