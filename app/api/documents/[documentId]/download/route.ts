import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import HTMLtoDOCX from "html-to-docx";
import { s3Client, getSignedDownloadUrl } from "@/lib/s3";
import { readFile } from "fs/promises";
import { join } from "path";
import React from "react";

export const runtime = "nodejs";

// Convert any Uint8Array-like view backed by ArrayBufferLike into a real ArrayBuffer
const toArrayBuffer = (view: {
  buffer: ArrayBufferLike;
  byteOffset: number;
  byteLength: number;
}): ArrayBuffer => {
  const ab = new ArrayBuffer(view.byteLength);
  const out = new Uint8Array(ab);
  const src = new Uint8Array(view.buffer, view.byteOffset, view.byteLength);
  out.set(src);
  return ab;
};

export async function GET(
  request: NextRequest,
  { params }: { params: { documentId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const documentId = params.documentId;

    const urlObj = new URL(request.url);
    const typeParam = urlObj.searchParams.get("type");
    const targetType = (typeParam === "pdf" ? "pdf" : "docx") as "docx" | "pdf";

    const document = await prisma.item.findFirst({
      where: {
        id: documentId,
        userId,
        type: "document",
      },
    });

    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    const safeName = (document.name || "document").replace(
      /[^a-zA-Z0-9_\-\.]/g,
      "_"
    );

    // If document has a stored URL/key, download directly from storage
    if (document.url && document.key) {
      if (s3Client) {
        const signedUrl = await getSignedDownloadUrl(document.key, 300);
        const res = await fetch(signedUrl);
        if (!res.ok) {
          return NextResponse.json(
            { error: "Failed to fetch from storage" },
            { status: 500 }
          );
        }
        const arrayBuffer = await res.arrayBuffer();
        const ext = document.key.split(".").pop()?.toLowerCase();
        const mime =
          ext === "pdf"
            ? "application/pdf"
            : ext === "docx"
            ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            : res.headers.get("content-type") || "application/octet-stream";

        return new Response(arrayBuffer, {
          headers: {
            "Content-Type": mime,
            "Content-Disposition": `attachment; filename="${safeName}.${
              ext || (mime.includes("pdf") ? "pdf" : "docx")
            }"`,
          },
        });
      } else {
        // Local storage fallback: read file from uploads directory
        const filePath = join(process.cwd(), "uploads", document.key);
        const buffer = await readFile(filePath);
        const ext = document.key.split(".").pop()?.toLowerCase();
        const mime =
          ext === "pdf"
            ? "application/pdf"
            : "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

        const u8 =
          buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
        const ab = toArrayBuffer({
          buffer: u8.buffer,
          byteOffset: u8.byteOffset,
          byteLength: u8.byteLength,
        });
        return new Response(ab, {
          headers: {
            "Content-Type": mime,
            "Content-Disposition": `attachment; filename="${safeName}.${
              ext || (mime.includes("pdf") ? "pdf" : "docx")
            }"`,
          },
        });
      }
    }

    // No stored file; convert HTML content to requested format
    const contentData = document.content ? JSON.parse(document.content) : {};
    const html: string = contentData.html || "";

    if (!html) {
      return NextResponse.json(
        { error: "No HTML content to convert" },
        { status: 400 }
      );
    }

    if (targetType === "pdf") {
      const { Document, Page, renderToBuffer } = await import(
        "@react-pdf/renderer"
      );
      const { Html } = await import("react-pdf-html");

      const pdfDocument = React.createElement(
        Document,
        null,
        React.createElement(
          Page,
          null,
          React.createElement(Html as any, null, html)
        )
      );

      const pdfBuf: any = await renderToBuffer(pdfDocument);
      const pdfU8: Uint8Array =
        pdfBuf instanceof Uint8Array ? pdfBuf : new Uint8Array(pdfBuf);
      const pdfAb = toArrayBuffer({
        buffer: pdfU8.buffer,
        byteOffset: pdfU8.byteOffset,
        byteLength: pdfU8.byteLength,
      });
      return new Response(pdfAb, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="${safeName}.pdf"`,
        },
      });
    } else {
      const styledHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="UTF-8">
            <title>${safeName}</title>
            <style>
              body {
                font-family: 'Times New Roman', serif;
                font-size: 12pt;
                line-height: 1.5;
                margin: 1in;
                color: #000;
              }
              h1 {
                font-size: 18pt;
                font-weight: bold;
                margin: 24pt 0 12pt 0;
                page-break-after: avoid;
              }
              h2 {
                font-size: 16pt;
                font-weight: bold;
                margin: 18pt 0 10pt 0;
                page-break-after: avoid;
              }
              h3 {
                font-size: 14pt;
                font-weight: bold;
                margin: 14pt 0 8pt 0;
                page-break-after: avoid;
              }
              h4 {
                font-size: 13pt;
                font-weight: bold;
                margin: 12pt 0 6pt 0;
                page-break-after: avoid;
              }
              h5 {
                font-size: 12pt;
                font-weight: bold;
                margin: 10pt 0 6pt 0;
                page-break-after: avoid;
              }
              p {
                margin: 0 0 12pt 0;
                text-align: justify;
              }
              ul, ol {
                margin: 12pt 0;
                padding-left: 36pt;
              }
              li {
                margin: 6pt 0;
              }
              table {
                border-collapse: collapse;
                width: 100%;
                margin: 12pt 0;
              }
              th, td {
                border: 1pt solid #000;
                padding: 6pt;
                text-align: left;
              }
              th {
                background-color: #f0f0f0;
                font-weight: bold;
              }
              blockquote {
                margin: 12pt 24pt;
                padding: 12pt;
                border-left: 3pt solid #ccc;
                background-color: #f9f9f9;
                font-style: italic;
              }
              code {
                font-family: 'Courier New', monospace;
                font-size: 10pt;
                background-color: #f5f5f5;
                padding: 2pt;
                border: 1pt solid #ddd;
              }
              pre {
                background-color: #f5f5f5;
                border: 1pt solid #ddd;
                padding: 12pt;
                margin: 12pt 0;
                overflow-x: auto;
              }
              pre code {
                background: none;
                border: none;
                padding: 0;
              }
            </style>
          </head>
          <body>
            ${html}
          </body>
        </html>
      `;

      const docOptions = {
        orientation: "portrait" as const,
        margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 },
        title: safeName,
        creator: "Document Assistant",
        font: "Times New Roman",
        fontSize: 22,
      };

      const docxBuf: any = await HTMLtoDOCX(styledHtml, null, docOptions);
      const docxU8: Uint8Array =
        docxBuf instanceof Uint8Array ? docxBuf : new Uint8Array(docxBuf);
      const docxAb = toArrayBuffer({
        buffer: docxU8.buffer,
        byteOffset: docxU8.byteOffset,
        byteLength: docxU8.byteLength,
      });
      return new Response(docxAb, {
        headers: {
          "Content-Type":
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
          "Content-Disposition": `attachment; filename="${safeName}.docx"`,
        },
      });
    }
  } catch (error) {
    console.error("Error generating download:", error);
    return NextResponse.json(
      { error: "Failed to generate document download" },
      { status: 500 }
    );
  }
}
