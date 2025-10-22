import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import * as XLSX from "xlsx";

export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { tableId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !(session.user as any).id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const urlObj = new URL(request.url);
    const typeParam = urlObj.searchParams.get("type");
    const targetType = (typeParam === "csv" ? "csv" : "xlsx") as "xlsx" | "csv";
    const sheetIndexParam = urlObj.searchParams.get("sheet") || "0";
    const sheetIndex = Math.max(0, parseInt(sheetIndexParam || "0", 10) || 0);

    const item = await prisma.item.findFirst({
      where: {
        id: params.tableId,
        userId: (session.user as any).id,
        type: "table",
      },
    });

    if (!item) {
      return NextResponse.json({ error: "Table not found" }, { status: 404 });
    }

    const data = item.content ? JSON.parse(item.content) : {};
    const sheets: Array<{ name: string; rows: number; cols: number; cells: Record<string, string> }> = data.sheets || [];
    if (!sheets.length) {
      return NextResponse.json({ error: "No sheet content to export" }, { status: 400 });
    }

    const aoaFromSheet = (s: any): any[][] => {
      const colLabel = (n: number) => {
        let t = "";
        while (n >= 0) { t = String.fromCharCode((n % 26) + 65) + t; n = Math.floor(n / 26) - 1; }
        return t;
      };
      const out: any[][] = [];
      for (let r = 0; r < s.rows; r++) {
        const row: any[] = [];
        for (let c = 0; c < s.cols; c++) {
          const addr = `${colLabel(c)}${r + 1}`;
          row.push(s.cells?.[addr] ?? "");
        }
        out.push(row);
      }
      return out;
    };

    if (targetType === "xlsx") {
      const wb = XLSX.utils.book_new();
      sheets.forEach((s) => {
        const ws = XLSX.utils.aoa_to_sheet(aoaFromSheet(s));
        XLSX.utils.book_append_sheet(wb, ws, s.name || "Sheet");
      });
      const wbout = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
      return new Response(wbout as any, {
        headers: {
          "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
          "Content-Disposition": `attachment; filename="${(item.name || "table").replace(/[^a-zA-Z0-9_\-\.]/g, "_")}.xlsx"`,
        },
      });
    } else {
      const s = sheets[Math.min(sheetIndex, sheets.length - 1)];
      const ws = XLSX.utils.aoa_to_sheet(aoaFromSheet(s));
      const csv = XLSX.utils.sheet_to_csv(ws);
      return new Response(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="${(item.name || "table").replace(/[^a-zA-Z0-9_\-\.]/g, "_")}-${(s.name || "Sheet")}.csv"`,
        },
      });
    }
  } catch (error) {
    console.error("Error generating table download:", error);
    return NextResponse.json(
      { error: "Failed to generate table download" },
      { status: 500 }
    );
  }
}