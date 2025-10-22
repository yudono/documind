import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth/next'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSignedDownloadUrl } from '@/lib/s3'

export const runtime = 'nodejs'

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const document = await prisma.item.findFirst({
      where: {
        id: params.documentId,
        userId: (session.user as any).id,
        type: "document",
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // If content is empty, attempt to load from original file URL and convert to HTML
    const hasContent = !!document.content && (() => {
      try {
        const parsed = JSON.parse(document.content as string)
        return !!parsed?.html && String(parsed.html).trim().length > 0
      } catch {
        return false
      }
    })()

    if (!hasContent) {
      try {
        // Determine source URL: prefer signed URL via key, otherwise use stored url
        let sourceUrl: string | null = null
        if (document.key) {
          sourceUrl = await getSignedDownloadUrl(document.key)
        } else if (document.url) {
          // Ensure absolute URL if relative
          try {
            sourceUrl = new URL(document.url, request.url).toString()
          } catch {
            sourceUrl = document.url
          }
        }

        if (sourceUrl) {
          const res = await fetch(sourceUrl)
          if (!res.ok) {
            throw new Error(`Failed to fetch original file: ${res.status} ${res.statusText}`)
          }
          const arrayBuffer = await res.arrayBuffer()
          const buffer = Buffer.from(arrayBuffer)

          // Detect mime from fileType or url extension
          const mime = document.fileType || (() => {
            try {
              const u = new URL(sourceUrl!)
              const ext = u.pathname.split('.').pop()?.toLowerCase()
              if (ext === 'pdf') return 'application/pdf'
              if (ext === 'docx') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
              return 'application/octet-stream'
            } catch {
              return 'application/octet-stream'
            }
          })()

          let generatedHtml = ''

          if (mime.includes('pdf')) {
            // Convert PDF to text then wrap as HTML
            const pdfParse = (await import('pdf-parse')).default
            const parsed = await pdfParse(buffer)
            const text = parsed?.text || ''
            const paragraphs = text
              .split(/\n\s*\n/g)
              .map(p => p.trim())
              .filter(p => p.length > 0)
            generatedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${paragraphs
              .map(p => `<p>${escapeHtml(p)}</p>`)
              .join('')}</body></html>`
          } else if (mime.includes('word') || mime.includes('officedocument') || mime.includes('docx')) {
            // Convert DOCX to HTML using mammoth
            const mammoth = await import('mammoth')
            const result = await mammoth.convertToHtml({ arrayBuffer }, {
              styleMap: [
                'p[style-name="Heading 1"] => h1',
                'p[style-name="Heading 2"] => h2',
                'p[style-name="Heading 3"] => h3'
              ]
            } as any)
            const docxHtml = result?.value || ''
            generatedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${docxHtml}</body></html>`
          }

          if (generatedHtml && generatedHtml.trim().length > 0) {
            const nowIso = new Date().toISOString()
            const updated = await prisma.item.update({
              where: { id: document.id },
              data: {
                content: JSON.stringify({
                  html: generatedHtml,
                  isDraft: false,
                  createdAt: document.createdAt?.toISOString?.() || nowIso,
                  lastModified: nowIso,
                }),
                updatedAt: new Date(),
              },
            })

            // Also create initial history entry if none exists
            const existingHistoryCount = await prisma.item.count({
              where: { parentId: document.id, type: 'document_history' }
            })
            if (existingHistoryCount === 0) {
              await prisma.item.create({
                data: {
                  name: `${document.name} - Initial Version`,
                  type: 'document_history',
                  userId: document.userId,
                  parentId: document.id,
                  content: JSON.stringify({
                    html: generatedHtml,
                    originalDocumentId: document.id,
                    createdAt: nowIso,
                    isDraft: false,
                  }),
                },
              })
            }

            return NextResponse.json(updated)
          }
        }
      } catch (e) {
        console.error('Error converting original file to HTML:', e)
        // Fall back to returning document as-is if conversion fails
      }
    }

    return NextResponse.json(document)
  } catch (error) {
    console.error('Error fetching document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const document = await prisma.item.findFirst({
      where: {
        id: params.documentId,
        userId: (session.user as any).id,
        type: "document",
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    await prisma.item.delete({
      where: {
        id: params.documentId,
      },
    })

    return NextResponse.json({ message: 'Document deleted successfully' })
  } catch (error) {
    console.error('Error deleting document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { name, folderId } = await request.json()

    const document = await prisma.item.findFirst({
      where: {
        id: params.documentId,
        userId: (session.user as any).id,
        type: "document",
      },
    })

    if (!document) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    const updatedDocument = await prisma.item.update({
      where: {
        id: params.documentId,
      },
      data: {
        ...(name && { name }),
        ...(folderId !== undefined && { parentId: folderId || null }),
      },
    })

    return NextResponse.json(updatedDocument)
  } catch (error) {
    console.error('Error updating document:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}