import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getSignedDownloadUrl } from "@/lib/s3";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const item = await prisma.item.findFirst({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
      include: {
        parent: true,
        children: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // If this is a document and it lacks HTML content, try to convert from original file
    if (item.type === "document") {
      const hasContent = !!item.content && (() => {
        try {
          const parsed = JSON.parse(item.content as string);
          return !!parsed?.html && String(parsed.html).trim().length > 0;
        } catch {
          return false;
        }
      })();

      if (!hasContent) {
        try {
          // Determine source URL: prefer signed URL via key, otherwise use stored url
          let sourceUrl: string | null = null;
          if (item.key) {
            sourceUrl = await getSignedDownloadUrl(item.key);
          } else if (item.url) {
            // Ensure absolute URL if relative
            try {
              sourceUrl = new URL(item.url, request.url).toString();
            } catch {
              sourceUrl = item.url;
            }
          }

          if (sourceUrl) {
            const res = await fetch(sourceUrl);
            if (!res.ok) {
              throw new Error(`Failed to fetch original file: ${res.status} ${res.statusText}`);
            }
            const arrayBuffer = await res.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);

            // Detect mime from fileType or url extension
            const mime = item.fileType || (() => {
              try {
                const u = new URL(sourceUrl!);
                const ext = u.pathname.split(".").pop()?.toLowerCase();
                if (ext === "pdf") return "application/pdf";
                if (ext === "docx") return "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                return "application/octet-stream";
              } catch {
                return "application/octet-stream";
              }
            })();

            let generatedHtml = "";

            if (mime.includes("pdf")) {
              // Convert PDF to text then wrap as HTML
              const pdfParse = (await import("pdf-parse")).default;
              const parsed = await pdfParse(buffer);
              const text = parsed?.text || "";
              const paragraphs = text
                .split(/\n\s*\n/g)
                .map((p) => p.trim())
                .filter((p) => p.length > 0);
              generatedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${paragraphs
                .map((p) => `<p>${escapeHtml(p)}</p>`)
                .join("")}</body></html>`;
            } else if (
              mime.includes("word") ||
              mime.includes("officedocument") ||
              mime.includes("docx")
            ) {
              // Convert DOCX to HTML using mammoth
              const mammoth = await import("mammoth");
              const result = await (mammoth as any).convertToHtml(
                { arrayBuffer },
                {
                  styleMap: [
                    'p[style-name="Heading 1"] => h1',
                    'p[style-name="Heading 2"] => h2',
                    'p[style-name="Heading 3"] => h3',
                  ],
                } as any
              );
              const docxHtml = result?.value || "";
              generatedHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>${docxHtml}</body></html>`;
            }

            if (generatedHtml && generatedHtml.trim().length > 0) {
              const nowIso = new Date().toISOString();
              const updated = await prisma.item.update({
                where: { id: item.id },
                data: {
                  content: JSON.stringify({
                    html: generatedHtml,
                    isDraft: false,
                    createdAt: item.createdAt?.toISOString?.() || nowIso,
                    lastModified: nowIso,
                  }),
                  updatedAt: new Date(),
                },
              });

              // Also create initial history entry if none exists
              const existingHistoryCount = await prisma.item.count({
                where: { parentId: item.id, type: "document_history" },
              });
              if (existingHistoryCount === 0) {
                await prisma.item.create({
                  data: {
                    name: `${item.name} - Initial Version`,
                    type: "document_history",
                    userId: item.userId,
                    parentId: item.id,
                    content: JSON.stringify({
                      html: generatedHtml,
                      originalDocumentId: item.id,
                      createdAt: nowIso,
                      isDraft: false,
                    }),
                  },
                });
              }

              return NextResponse.json(updated);
            }
          }
        } catch (e) {
          console.error("Error converting original file to HTML:", e);
          // Fall back to returning item as-is if conversion fails
        }
      }
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error("Error fetching item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { name, ...updateData } = body;

    // Check if item exists and belongs to user
    const existingItem = await prisma.item.findFirst({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // If name is being updated, check for conflicts
    if (name && name !== existingItem.name) {
      const conflictingItem = await prisma.item.findFirst({
        where: {
          name,
          parentId: existingItem.parentId,
          userId: (session.user as any).id,
          type: existingItem.type,
          id: { not: params.id },
        },
      });

      if (conflictingItem) {
        return NextResponse.json(
          {
            error: `${existingItem.type === "folder" ? "Folder" : "Document"} with this name already exists`,
          },
          { status: 409 }
        );
      }
    }

    const updatedItem = await prisma.item.update({
      where: { id: params.id },
      data: {
        name,
        ...updateData,
      },
      include: {
        parent: true,
        children: {
          select: {
            id: true,
            name: true,
            type: true,
          },
        },
      },
    });

    return NextResponse.json(updatedItem);
  } catch (error) {
    console.error("Error updating item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if item exists and belongs to user
    const existingItem = await prisma.item.findFirst({
      where: {
        id: params.id,
        userId: (session.user as any).id,
      },
      include: {
        children: true,
      },
    });

    if (!existingItem) {
      return NextResponse.json({ error: "Item not found" }, { status: 404 });
    }

    // For folders, check if they have children
    if (existingItem.type === "folder" && existingItem.children.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete folder that contains items" },
        { status: 400 }
      );
    }

    await prisma.item.delete({
      where: { id: params.id },
    });

    return NextResponse.json({ message: "Item deleted successfully" });
  } catch (error) {
    console.error("Error deleting item:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
