import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { performOCR } from '@/lib/groq'
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

    const body = await request.json()
    const { imageUrl, prompt } = body

    if (!imageUrl) {
      return NextResponse.json({ error: 'Image URL is required' }, { status: 400 })
    }

    // Validate URL format, allow relative by resolving against base candidates
    let normalizedUrl: string
    try {
      const u = new URL(imageUrl)
      if (u.protocol === 'http:' || u.protocol === 'https:') {
        normalizedUrl = u.toString()
      } else {
        throw new Error('Unsupported protocol')
      }
    } catch {
      try {
        const bases = [
          process.env.NEXT_PUBLIC_APP_URL,
          process.env.NEXTAUTH_URL,
          process.env.NEXTAPP_URL,
          process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
          request.url,
        ].filter(Boolean) as string[]
        let resolved: string | undefined
        for (const base of bases) {
          try {
            const u2 = new URL(imageUrl, base)
            if (u2.protocol === 'http:' || u2.protocol === 'https:') {
              resolved = u2.toString()
              break
            }
          } catch {}
        }
        if (!resolved) throw new Error('Unable to resolve absolute URL')
        normalizedUrl = resolved
      } catch {
        return NextResponse.json({ error: 'Invalid image URL; must be http/https' }, { status: 400 })
      }
    }

    // Use Groq OCR to extract text from document image
    const extractedText = await performOCR(
      normalizedUrl,
      prompt || "Extract all text from this document image. Provide the text content in a clear, structured format, maintaining the original layout and formatting as much as possible."
    )

    return NextResponse.json({
      success: true,
      imageUrl: normalizedUrl,
      extractedText,
      processedAt: new Date().toISOString(),
      processedBy: user.id,
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
      { error: 'Failed to process document image for OCR' },
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