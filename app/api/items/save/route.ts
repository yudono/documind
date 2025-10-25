import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToS3, generateFileKey } from "@/lib/s3";
import HTMLtoDOCX from "html-to-docx";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userId = (session.user as any).id;
    const { id, title, content, isDraft } = await request.json();

    // Validate required fields
    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    let document;
    let docxBuffer: Buffer | null = null;
    let docxUploadResult = null;

    // Generate DOCX from HTML content
    try {
      docxBuffer = await HTMLtoDOCX(content);
      
      // Upload DOCX to S3
      if (docxBuffer) {
        const docxKey = generateFileKey(`${title}.docx`, 'documents/docx');
        docxUploadResult = await uploadToS3(docxBuffer, docxKey, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      }
    } catch (error) {
      console.error("Error generating DOCX:", error);
      // Continue without DOCX if generation fails
    }

    if (id) {
      // Check if document exists and belongs to user
      const existingDocument = await prisma.item.findFirst({
        where: {
          id: id,
          userId: userId,
          type: "document",
        },
      });

      if (!existingDocument) {
        return NextResponse.json(
          { error: "Document not found or access denied" },
          { status: 404 }
        );
      }

      // Update existing document
      document = await prisma.item.update({
        where: {
          id: id,
        },
        data: {
          name: title,
          content: JSON.stringify({
            html: content,
            isDraft,
            lastModified: new Date().toISOString(),
          }),
          url: docxUploadResult?.url || existingDocument.url,
          key: docxUploadResult?.key || existingDocument.key,
          updatedAt: new Date(),
        },
      });

      // Create history entry if not a draft
      if (!isDraft) {
        await prisma.item.create({
          data: {
            name: `${title} - Version ${new Date().toISOString()}`,
            type: "document_history",
            userId: userId,
            parentId: document.id,
            content: JSON.stringify({
              html: content,
              originalDocumentId: document.id,
              createdAt: new Date().toISOString(),
              isDraft: false,
            }),
          },
        });
      }
    } else {
      // Create new document
      document = await prisma.item.create({
        data: {
          name: title,
          type: "document",
          userId: userId,
          content: JSON.stringify({
            html: content,
            isDraft,
            createdAt: new Date().toISOString(),
            lastModified: new Date().toISOString(),
          }),
          url: docxUploadResult?.url,
          key: docxUploadResult?.key,
        },
      });

      // Create initial history entry if not a draft
      if (!isDraft) {
        await prisma.item.create({
          data: {
            name: `${title} - Initial Version`,
            type: "document_history",
            userId: userId,
            parentId: document.id,
            content: JSON.stringify({
              html: content,
              originalDocumentId: document.id,
              createdAt: new Date().toISOString(),
              isDraft: false,
            }),
          },
        });
      }
    }

    const documentData = document.content ? JSON.parse(document.content) : {};

    return NextResponse.json({
      id: document.id,
      title: document.name,
      content: documentData.html || content,
      isDraft: documentData.isDraft || isDraft,
      lastModified: documentData.lastModified,
    });

  } catch (error) {
    console.error("Error saving document:", error);
    return NextResponse.json(
      { error: "Failed to save document" },
      { status: 500 }
    );
  }
}