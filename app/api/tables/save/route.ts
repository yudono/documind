import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { uploadToS3, generateFileKey } from "@/lib/s3";
import * as XLSX from "xlsx";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { id, title, content, isDraft } = await request.json();

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required" },
        { status: 400 }
      );
    }

    const contentPayload = {
      sheets: content.sheets || [],
      isDraft: !!isDraft,
      createdAt: new Date().toISOString(),
      lastModified: new Date().toISOString(),
    };

    // Build XLSX buffer from sheets (default convert to xlsx)
    const aoaFromSheet = (s: any): any[][] => {
      const colLabel = (n: number) => {
        let t = "";
        while (n >= 0) {
          t = String.fromCharCode((n % 26) + 65) + t;
          n = Math.floor(n / 26) - 1;
        }
        return t;
      };
      const out: any[][] = [];
      const rows = typeof s.rows === "number" ? s.rows : 0;
      const cols = typeof s.cols === "number" ? s.cols : 0;
      for (let r = 0; r < rows; r++) {
        const row: any[] = [];
        for (let c = 0; c < cols; c++) {
          const addr = `${colLabel(c)}${r + 1}`;
          row.push(s.cells?.[addr] ?? "");
        }
        out.push(row);
      }
      return out;
    };

    const wb = XLSX.utils.book_new();
    const sheets = Array.isArray(contentPayload.sheets)
      ? contentPayload.sheets
      : [];
    if (sheets.length) {
      sheets.forEach((s: any) => {
        const ws = XLSX.utils.aoa_to_sheet(aoaFromSheet(s));
        XLSX.utils.book_append_sheet(wb, ws, s.name || "Sheet");
      });
    } else {
      const ws = XLSX.utils.aoa_to_sheet([[]]);
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
    }
    const xlsxBuffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

    // Upload XLSX to S3 (or local uploads)
    let xlsxUploadResult: { url: string; key: string; bucket: string } | null =
      null;
    try {
      const xlsxKey = generateFileKey(`${title}.xlsx`, "tables/xlsx");
      xlsxUploadResult = await uploadToS3(
        xlsxBuffer as Buffer,
        xlsxKey,
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    } catch (err) {
      console.error("Error generating/uploading XLSX:", err);
    }

    let item;
    if (id) {
      const existingItem = await prisma.item.findFirst({
        where: { id, userId, type: "table" },
      });
      if (!existingItem) {
        return NextResponse.json(
          { error: "Table not found or access denied" },
          { status: 404 }
        );
      }

      item = await prisma.item.update({
        where: { id },
        data: {
          name: title,
          type: "table",
          content: JSON.stringify(contentPayload),
          url: xlsxUploadResult?.url || existingItem.url,
          key: xlsxUploadResult?.key || existingItem.key,
          updatedAt: new Date(),
        },
      });
    } else {
      item = await prisma.item.create({
        data: {
          name: title,
          type: "table",
          userId,
          content: JSON.stringify(contentPayload),
          url: xlsxUploadResult?.url || undefined,
          key: xlsxUploadResult?.key || undefined,
        },
      });
    }

    const data = item.content ? JSON.parse(item.content) : {};
    return NextResponse.json({
      id: item.id,
      title: item.name,
      content: data,
      isDraft: data.isDraft,
      lastModified: data.lastModified,
      url: item.url || null,
      key: item.key || null,
    });
  } catch (error) {
    console.error("Error saving table:", error);
    return NextResponse.json(
      { error: "Failed to save table" },
      { status: 500 }
    );
  }
}
