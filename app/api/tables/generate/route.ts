import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AIDocumentFormatter } from "@/lib/ai-document-formatter";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const userId = (session.user as any).id;
    const { prompt } = await request.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const formatter = new AIDocumentFormatter();
    const aiResult = await formatter.formatDocument(prompt);

    if (!aiResult.success || !aiResult.data) {
      return NextResponse.json(
        { error: aiResult.error || "Failed to generate table content" },
        { status: 500 }
      );
    }

    const { documentType, structuredData } = aiResult.data;

    // Map AI structured table data to our Sheets format
    let title = "AI Generated Table";
    let sheets: Array<{ id: string; name: string; rows: number; cols: number; cells: Record<string, string> }> = [];

    const colLabel = (n: number) => {
      let s = "";
      while (n >= 0) {
        s = String.fromCharCode((n % 26) + 65) + s;
        n = Math.floor(n / 26) - 1;
      }
      return s;
    };

    if (documentType === "table") {
      const tableData: any = structuredData;
      title = tableData.title || title;
      const headers: string[] = Array.isArray(tableData.headers) ? tableData.headers : [];
      const dataRows: string[][] = Array.isArray(tableData.rows) ? tableData.rows : [];

      const rows = (headers.length ? 1 : 0) + dataRows.length;
      const cols = headers.length || (dataRows[0]?.length || 0);
      const cells: Record<string, string> = {};

      // Header row
      if (headers.length) {
        headers.forEach((h, c) => {
          const addr = `${colLabel(c)}${1}`;
          cells[addr] = h;
        });
      }

      // Data rows
      dataRows.forEach((row, rIndex) => {
        row.forEach((val, cIndex) => {
          const addr = `${colLabel(cIndex)}${(headers.length ? 2 : 1) + rIndex}`;
          cells[addr] = String(val ?? "");
        });
      });

      sheets.push({ id: "sheet-1", name: "Sheet1", rows, cols, cells });
    } else {
      // Fallback: put formatted content into a single-cell table
      const formatted = aiResult.data.formattedOutput || "";
      const cells: Record<string, string> = { A1: formatted };
      sheets.push({ id: "sheet-1", name: "Sheet1", rows: 1, cols: 1, cells });
    }

    return NextResponse.json({ title, sheets });
  } catch (error) {
    console.error("Error generating table via AI:", error);
    return NextResponse.json(
      { error: "Failed to generate table via AI" },
      { status: 500 }
    );
  }
}