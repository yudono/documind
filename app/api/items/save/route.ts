import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToS3, generateFileKey, deleteFromS3 } from "@/lib/s3";
// import HTMLtoDOCX from "html-to-docx";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id, title, content, url, key, type } = await request.json();

    // Validate required fields
    if (!title) {
      return NextResponse.json(
        { error: "Title are required" },
        { status: 400 }
      );
    }

    // Check if item with same name exists in the same parent
    // const existingItem = await prisma.item.findFirst({
    //   where: {
    //     name: title,
    //     parentId: null,
    //     userId: (session.user as any).id,
    //     deleteAt: null,
    //   },
    // });

    // if (existingItem) {
    //   return NextResponse.json(
    //     {
    //       error: `Document with this name already exists`,
    //     },
    //     { status: 409 }
    //   );
    // }

    let document;
    let docxBuffer: Buffer | null = null;
    let docxUploadResult = null;

    // Generate DOCX from HTML content
    // try {
    //   docxBuffer = await HTMLtoDOCX(content);

    //   // Upload DOCX to S3
    //   if (docxBuffer) {
    //     const docxKey = generateFileKey(`${title}.docx`, 'documents/docx');
    //     docxUploadResult = await uploadToS3(docxBuffer, docxKey, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    //   }
    // } catch (error) {
    //   console.error("Error generating DOCX:", error);
    //   // Continue without DOCX if generation fails
    // }

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

      // remove old file from storage using object key (not URL)
      if (existingDocument.key) {
        await deleteFromS3(existingDocument.key);
      }

      // Update existing document
      document = await prisma.item.update({
        where: {
          id: id,
        },
        data: {
          name: title,
          content: "{}",
          url: url,
          key: key,
          updatedAt: new Date(),
          type: type,
        },
      });
    } else {
      // Create new document
      document = await prisma.item.create({
        data: {
          name: title,
          type: "document",
          userId: userId,
          content: "{}",
          url: url,
          key: key,
        },
      });
    }

    const documentData = document.content ? JSON.parse(document.content) : {};

    return NextResponse.json({
      id: document.id,
      title: document.name,
      content: documentData.html || content,
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
