"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Head from "next/head";
import Script from "next/script";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Save,
  Download,
  Plus,
  ArrowLeft,
  Sheet as SheetIcon,
  Brain,
  Bot,
  Sparkle,
  Sparkles,
  X,
  RefreshCw,
} from "lucide-react";
import * as XLSX from "xlsx";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import AIChatSidebarTables from "@/components/ai-chat-sidebar-tables";
import LuckysheetTable, {
  type LuckysheetTableRef,
  type SheetData,
} from "@/components/tables/luckysheet-table";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Basic spreadsheet types
interface CellMap {
  [addr: string]: string;
}

const colLabel = (n: number) => {
  let s = "";
  while (n >= 0) {
    s = String.fromCharCode((n % 26) + 65) + s;
    n = Math.floor(n / 26) - 1;
  }
  return s;
};

export default function TablesEditorPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const params = useSearchParams();

  const [documentItem, setDocumentItem] = useState<{
    id: any;
    title: string;
    type: string;
    userId?: string;
    parentId?: any;
    fileType?: string;
    size?: number;
    content?: string;
    url: any;
    previewUrl?: string | null;
    key: any;
    bucket?: any;
    color?: string;
    deleteAt?: any;
    createdAt?: string;
    updatedAt?: string;
    parent?: any;
    children?: any[];
  } | null>(null);

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const tableId = params.get("id");

  // AI generation state
  const [showAISidebar, setShowAISidebar] = useState(false);

  const [sheets, setSheets] = useState<SheetData[]>([
    { id: "sheet-1", name: "Sheet1", rows: 40, cols: 40, cells: {} },
  ]);
  const [sheetsKey, setSheetsKey] = useState(0);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);
  const luckysheetRef = useRef<LuckysheetTableRef | null>(null);
  const [pluginLoaded, setPluginLoaded] = useState(false);
  const [assetsLoaded, setAssetsLoaded] = useState(false);

  // Load existing table if id is present
  useEffect(() => {
    if (!tableId) return;
    (async () => {
      try {
        const res = await fetch(`/api/items/${tableId}`);
        if (res.ok) {
          const data = await res.json();
          setDocumentItem(data);
        }
      } catch (e) {
        console.error("Failed to load table:", e);
      }
    })();
  }, [params]);

  const aoaFromSheet = (sheet: SheetData): any[][] => {
    const out: any[][] = [];
    for (let r = 0; r < sheet.rows; r++) {
      const row: any[] = [];
      for (let c = 0; c < sheet.cols; c++) {
        const addr = `${colLabel(c)}${r + 1}`;
        row.push(sheet.cells[addr] ?? "");
      }
      out.push(row);
    }
    return out;
  };

  // Parse XLSX workbook into our SheetData[] shape
  const sheetsFromWorkbook = (wb: XLSX.WorkBook): SheetData[] => {
    const out: SheetData[] = [];
    wb.SheetNames.forEach((name) => {
      const ws = wb.Sheets[name];
      const ref = ws["!ref"] || "A1";
      const range = XLSX.utils.decode_range(ref);
      const rows = Math.max(range.e.r + 1, 1);
      const cols = Math.max(range.e.c + 1, 1);
      const cells: Record<string, string> = {};
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          const addr = XLSX.utils.encode_cell({ r, c });
          const cell = ws[addr];
          if (cell && cell.v != null) {
            const val = typeof cell.w === "string" ? cell.w : String(cell.v);
            if (val !== undefined) cells[addr] = val;
          }
        }
      }
      out.push({
        id:
          typeof crypto !== "undefined" && "randomUUID" in crypto
            ? crypto.randomUUID()
            : `sheet-${Date.now()}-${name}`,
        name,
        rows: rows < 40 ? 40 : rows,
        cols: cols < 40 ? 40 : cols,
        cells,
      });
    });
    return out.length
      ? out
      : [{ id: "sheet-1", name: "Sheet1", rows: 40, cols: 40, cells: {} }];
  };

  // Load sheets from XLSX file url when available
  useEffect(() => {
    const url = documentItem?.url as string | undefined;
    if (!url) return;
    const lower = url.toLowerCase();
    const looksXlsx =
      lower.endsWith(".xlsx") ||
      lower.includes(
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
    if (!looksXlsx) {
      // Skip loading if URL is not an XLSX file
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        // Prefer same-origin proxy to avoid CORS/mixed-content on deploy
        const proxied = `/api/proxy/fetch?url=${encodeURIComponent(url)}`;
        const res = await fetch(proxied);
        if (!res.ok) throw new Error(`Failed to fetch XLSX: ${res.status}`);
        const ct = (res.headers.get("content-type") || "").toLowerCase();
        const isXlsxContent =
          ct.includes("spreadsheetml") ||
          ct.includes("officedocument.spreadsheetml");

        if (!isXlsxContent) {
          console.warn("Provided URL content-type is not XLSX:", ct);
          return;
        }
        const ab = await res.arrayBuffer();

        let wb: XLSX.WorkBook;
        try {
          wb = XLSX.read(ab, { type: "array" });
        } catch (err) {
          console.error("XLSX parse failed:", err);
          return;
        }
        const parsed = sheetsFromWorkbook(wb);

        if (!cancelled) {
          setSheets(parsed);
          // Force LuckysheetTable to recreate with the new parsed sheets
          setSheetsKey((k) => k + 1);
        }
      } catch (e) {
        console.error("Load from XLSX url failed:", e);
      }
    })();
    return () => {
      cancelled = true;
    };
    // Only react to url changes, avoid overwriting user edits
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentItem?.url]);

  const handleSave = async (isDraft: boolean = false) => {
    if (!session?.user) return;
    setIsSaving(true);
    try {
      // First, export to Excel
      const wb = XLSX.utils.book_new();
      sheets.forEach((s) => {
        const ws = XLSX.utils.aoa_to_sheet(aoaFromSheet(s));
        XLSX.utils.book_append_sheet(wb, ws, s.name);
      });
      const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });

      // Create Excel file
      const XLSX_MIME =
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
      const named = documentItem?.title.split(".")[0] || "Untitled";
      const filename = `${named}.xlsx`;
      const excelFile = new File([wbout], filename, {
        type: XLSX_MIME,
      });

      // Upload the Excel file
      const formData = new FormData();
      formData.append("file", excelFile);

      const uploadRes = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadRes.ok) {
        throw new Error("Upload failed");
      }

      const uploadData = await uploadRes.json();
      const uploadedUrl = uploadData?.file?.url || "";
      const uploadKey = uploadData?.file?.key || "";

      // Save table data with uploaded file info
      const response = await fetch("/api/items/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tableId,
          title: documentItem?.title || "Untitled Table",
          content: { sheets },
          url: uploadedUrl,
          key: uploadKey,
          isDraft,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setLastSaved(new Date());
        toast.success("Table saved successfully");
      } else {
        throw new Error(await response.text());
      }
    } catch (error) {
      // console.error("Save table failed:", error);
      toast.error("Save failed");
    } finally {
      setIsSaving(false);
    }
  };

  // const exportXlsx = () => {
  //   const wb = XLSX.utils.book_new();
  //   sheets.forEach((s) => {
  //     const ws = XLSX.utils.aoa_to_sheet(aoaFromSheet(s));
  //     XLSX.utils.book_append_sheet(wb, ws, s.name);
  //   });
  //   const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
  //   const blob = new Blob([wbout], {
  //     type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  //   });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = `${title}.xlsx`;
  //   document.body.appendChild(a);
  //   a.click();
  //   URL.revokeObjectURL(url);
  //   document.body.removeChild(a);
  // };

  // const exportCsv = () => {
  //   const s = sheets[activeSheetIndex];
  //   const ws = XLSX.utils.aoa_to_sheet(aoaFromSheet(s));
  //   const csv = XLSX.utils.sheet_to_csv(ws);
  //   const blob = new Blob([csv], { type: "text/csv" });
  //   const url = URL.createObjectURL(blob);
  //   const a = document.createElement("a");
  //   a.href = url;
  //   a.download = `${title}-${s.name}.csv`;
  //   document.body.appendChild(a);
  //   a.click();
  //   URL.revokeObjectURL(url);
  //   document.body.removeChild(a);
  // };

  return (
    <div className="h-screen bg-background">
      <Script
        src="https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/js/plugin.js"
        strategy="afterInteractive"
        onLoad={() => setPluginLoaded(true)}
      />
      {pluginLoaded && (
        <Script
          src="https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/luckysheet.umd.js"
          strategy="afterInteractive"
          onLoad={() => setAssetsLoaded(true)}
        />
      )}
      {/* Header */}
      <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.push("/dashboard/documents")}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <Input
              value={documentItem?.title}
              onChange={(e) =>
                setDocumentItem((prev) =>
                  prev
                    ? { ...prev, title: e.target.value || "Untitled" }
                    : {
                        id: tableId,
                        title: e.target.value || "Untitled",
                        content: "",
                        url: "",
                        key: "",
                        type: "table",
                      }
                )
              }
              className="text-lg font-semibold border-none bg-transparent px-0 focus-visible:ring-0"
              placeholder="Table title..."
            />
          </div>
          <div className="flex items-center space-x-2">
            {/* {lastSaved && (
              <span className="text-sm text-muted-foreground">
                {isSaving
                  ? "Saving..."
                  : `Saved ${lastSaved.toLocaleTimeString()}`}
              </span>
            )} */}
            <Button
              variant="link"
              className="text-muted-foreground"
              size="sm"
              onClick={() => setShowAISidebar((v) => !v)}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            {/* <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-2" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={exportXlsx}>XLSX</DropdownMenuItem>
                <DropdownMenuItem onClick={exportCsv}>
                  CSV (active sheet)
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu> */}

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={isSaving}
            >
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-row w-full">
        {/* Spreadsheet Grid (Luckysheet) */}
        <div className={cn("flex-1")}>
          <div
            className={cn(
              "h-[calc(100vh-74px)] overflow-hidden",
              showAISidebar ? "w-[calc(100vw-600px)]" : " w-[calc(100vw-260px)]"
            )}
          >
            <LuckysheetTable
              key={sheetsKey}
              ref={luckysheetRef}
              sheets={sheets}
              onSheetsChange={setSheets}
              onActiveSheetIndexChange={setActiveSheetIndex}
              assetsLoaded={assetsLoaded}
            />
          </div>
        </div>

        <div
          className={cn(
            "w-80 border-l bg-background flex flex-col",
            !showAISidebar && "hidden"
          )}
        >
          {/* AI Sidebar */}
          {/* <AIChatSidebarTables
            isVisible={showAISidebar}
            inline={false}
            onApplyTable={applyRowsToActiveSheet}
            tableId={tableId ?? undefined}
            contextRows={
              activeSheet
                ? Array.from({ length: activeSheet.rows }).map((_, r) =>
                    Array.from({ length: activeSheet.cols }).map((_, c) => {
                      const addr = `${colLabel(c)}${r + 1}`;
                      return activeSheet.cells[addr] ?? "";
                    })
                  )
                : undefined
            }
          /> */}
        </div>
      </div>
    </div>
  );
}
