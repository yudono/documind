"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
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
import { cn } from "@/lib/utils";

// Basic spreadsheet types
interface CellMap {
  [addr: string]: string;
}
interface SheetData {
  id: string;
  name: string;
  rows: number;
  cols: number;
  cells: CellMap;
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

  const [title, setTitle] = useState("Untitled Table");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [tableId, setTableId] = useState<string | null>(params.get("id"));

  // AI generation state
  const [showAISidebar, setShowAISidebar] = useState(false);

  const [sheets, setSheets] = useState<SheetData[]>([
    { id: "sheet-1", name: "Sheet1", rows: 20, cols: 10, cells: {} },
  ]);
  const [activeSheetIndex, setActiveSheetIndex] = useState(0);

  const activeSheet = sheets[activeSheetIndex];

  const applyRowsToActiveSheet = (rows: any[][]) => {
    const newRows = rows.length;
    const newCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
    setSheets((prev) => {
      const next = [...prev];
      const sheet = { ...next[activeSheetIndex] };
      const cells: CellMap = {};
      for (let r = 0; r < newRows; r++) {
        for (let c = 0; c < (rows[r]?.length || 0); c++) {
          const addr = `${colLabel(c)}${r + 1}`;
          cells[addr] = String(rows[r][c] ?? "");
        }
      }
      sheet.rows = newRows;
      sheet.cols = newCols;
      sheet.cells = cells;
      next[activeSheetIndex] = sheet;
      return next;
    });
  };

  // Load existing table if id is present
  useEffect(() => {
    const id = params.get("id");
    if (!id) return;
    (async () => {
      try {
        const res = await fetch(`/api/tables/${id}`);
        if (res.ok) {
          const data = await res.json();
          setTitle(data.title || "Untitled Table");
          const cs = (data.content?.sheets as SheetData[]) || sheets;
          setSheets(cs.length ? cs : sheets);
          setTableId(data.id);
        }
      } catch (e) {
        console.error("Failed to load table:", e);
      }
    })();
  }, [params]);

  // Change a cell value
  const setCell = (r: number, c: number, v: string) => {
    setSheets((prev) => {
      const next = [...prev];
      const sheet = { ...next[activeSheetIndex] };
      const addr = `${colLabel(c)}${r + 1}`;
      const cells = { ...sheet.cells };
      if (v) cells[addr] = v;
      else delete cells[addr];
      sheet.cells = cells;
      next[activeSheetIndex] = sheet;
      return next;
    });
  };

  const addSheet = () => {
    const idx = sheets.length + 1;
    setSheets((prev) => [
      ...prev,
      {
        id: `sheet-${idx}`,
        name: `Sheet${idx}`,
        rows: 20,
        cols: 10,
        cells: {},
      },
    ]);
    setActiveSheetIndex(sheets.length);
  };

  const addRow = () => {
    setSheets((prev) => {
      const next = [...prev];
      next[activeSheetIndex] = {
        ...next[activeSheetIndex],
        rows: next[activeSheetIndex].rows + 1,
      };
      return next;
    });
  };

  const addCol = () => {
    setSheets((prev) => {
      const next = [...prev];
      next[activeSheetIndex] = {
        ...next[activeSheetIndex],
        cols: next[activeSheetIndex].cols + 1,
      };
      return next;
    });
  };

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

  const handleSave = async (isDraft: boolean) => {
    if (!session?.user) return;
    setIsSaving(true);
    try {
      const response = await fetch("/api/tables/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: tableId,
          title,
          content: { sheets },
          isDraft,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        if (!tableId) setTableId(data.id);
        setLastSaved(new Date());
      }
    } catch (e) {
      console.error("Save table failed:", e);
    } finally {
      setIsSaving(false);
    }
  };

  const exportXlsx = () => {
    const wb = XLSX.utils.book_new();
    sheets.forEach((s) => {
      const ws = XLSX.utils.aoa_to_sheet(aoaFromSheet(s));
      XLSX.utils.book_append_sheet(wb, ws, s.name);
    });
    const wbout = XLSX.write(wb, { type: "array", bookType: "xlsx" });
    const blob = new Blob([wbout], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.xlsx`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const exportCsv = () => {
    const s = sheets[activeSheetIndex];
    const ws = XLSX.utils.aoa_to_sheet(aoaFromSheet(s));
    const csv = XLSX.utils.sheet_to_csv(ws);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}-${s.name}.csv`;
    document.body.appendChild(a);
    a.click();
    URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <div className="h-screen bg-background">
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
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg font-semibold border-none bg-transparent px-0 focus-visible:ring-0"
              placeholder="Table title..."
            />
          </div>
          <div className="flex items-center space-x-2">
            {lastSaved && (
              <span className="text-sm text-muted-foreground">
                {isSaving
                  ? "Saving..."
                  : `Saved ${lastSaved.toLocaleTimeString()}`}
              </span>
            )}
            <Button
              variant="link"
              className="text-muted-foreground"
              size="sm"
              onClick={() => setShowAISidebar((v) => !v)}
            >
              <Sparkles className="h-4 w-4" />
            </Button>
            <DropdownMenu>
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
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSave(false)}
              disabled={isSaving}
            >
              <Save className="h-4 w-4 mr-2" /> Save
            </Button>
          </div>
        </div>
      </div>

      <div className="flex flex-row w-full">
        {/* Spreadsheet Grid */}
        <div className="flex-1">
          {/* Sheet Tabs & Actions */}
          <div className="flex items-center justify-between px-4 py-2 border-b">
            <div className="flex items-center gap-2">
              {sheets.map((s, i) => (
                <Button
                  key={s.id}
                  variant={"outline"}
                  className={cn(
                    i === activeSheetIndex ? "bg-neutral-300 font-bold" : ""
                  )}
                  size="sm"
                  onClick={() => setActiveSheetIndex(i)}
                >
                  <SheetIcon className="h-4 w-4 mr-2" /> {s.name}
                </Button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <Button variant="secondary" size="sm" onClick={addSheet}>
                <Plus className="h-4 w-4 mr-2" /> Add Sheet
              </Button>
              <Button variant="secondary" size="sm" onClick={addRow}>
                + Row
              </Button>
              <Button variant="secondary" size="sm" onClick={addCol}>
                + Column
              </Button>
            </div>
          </div>

          <div
            className={cn(
              "overflow-auto",
              showAISidebar ? "w-[calc(100vw-600px)]" : " w-[calc(100vw-260px)]"
            )}
          >
            <table className="min-w-full border">
              <thead>
                <tr>
                  <th className="border px-2 py-1 bg-muted text-xs w-12">#</th>
                  {Array.from({ length: activeSheet.cols }).map((_, c) => (
                    <th
                      key={c}
                      className="border px-2 py-1 bg-muted text-xs min-w-[120px]"
                    >
                      {colLabel(c)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: activeSheet.rows }).map((_, r) => (
                  <tr key={r}>
                    <td className="border px-2 py-1 bg-muted text-xs w-12">
                      {r + 1}
                    </td>
                    {Array.from({ length: activeSheet.cols }).map((_, c) => {
                      const addr = `${colLabel(c)}${r + 1}`;
                      const val = activeSheet.cells[addr] ?? "";
                      return (
                        <td key={c} className="border px-2 py-1 align-top">
                          <div
                            contentEditable
                            suppressContentEditableWarning
                            className="min-h-[28px] outline-none"
                            onBlur={(e) =>
                              setCell(
                                r,
                                c,
                                (e.target as HTMLDivElement).innerText
                              )
                            }
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                (e.target as HTMLDivElement).blur();
                              }
                            }}
                          >
                            {val}
                          </div>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div
          className={cn(
            "w-80 border-l bg-background flex flex-col",
            !showAISidebar && "hidden"
          )}
        >
          {/* AI Sidebar */}
          <AIChatSidebarTables
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
          />
        </div>
      </div>
    </div>
  );
}
