"use client";

import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";

// Struktur data sederhana yang sudah ada di page
interface CellMap {
  [addr: string]: string;
}
export interface SheetData {
  id: string;
  name: string;
  rows: number;
  cols: number;
  cells: CellMap;
}

export interface LuckysheetTableRef {
  applyRowsToActiveSheet: (rows: any[][]) => void;
}

interface LuckysheetTableProps {
  sheets: SheetData[];
  onSheetsChange?: (sheets: SheetData[]) => void;
  onActiveSheetIndexChange?: (index: number) => void;
  className?: string;
  assetsLoaded?: boolean;
  loadingFallback?: React.ReactNode;
}

// Utility: parse address seperti "A1" => { r:0, c:0 }
function addrToRC(addr: string): { r: number; c: number } {
  const match = addr.match(/^([A-Z]+)(\d+)$/i);
  if (!match) return { r: 0, c: 0 };
  const letters = match[1].toUpperCase();
  const row = parseInt(match[2], 10) - 1;
  let col = 0;
  for (let i = 0; i < letters.length; i++) {
    col = col * 26 + (letters.charCodeAt(i) - 64);
  }
  col -= 1;
  return { r: row, c: col };
}

// Convert SheetData[] -> Luckysheet data format
function toLuckysheetData(sheets: SheetData[]) {
  if (!sheets || sheets.length === 0) {
    return [
      {
        name: "Sheet1",
        index: 0,
        status: 1,
        row: 50,
        column: 26,
        celldata: [],
      },
    ];
  }
  return sheets.map((sheet, idx) => {
    const celldata = Object.entries(sheet.cells).map(([addr, v]) => {
      const { r, c } = addrToRC(addr);
      return { r, c, v: { v } };
    });
    return {
      name: sheet.name,
      index: idx,
      status: idx === 0 ? 1 : 0,
      row: sheet.rows,
      column: sheet.cols,
      celldata,
    };
  });
}

// Extract current sheets from Luckysheet runtime into SheetData[]
function extractSheetsFromRuntime(): SheetData[] {
  const ls: any = (window as any).luckysheet;
  if (!ls || !ls.getAllSheets) return [];
  const all = ls.getAllSheets();
  return all.map((s: any, idx: number) => {
    const rows = s.row || (s.data ? s.data.length : 0) || 0;
    const cols = s.column || (s.data && s.data[0] ? s.data[0].length : 0) || 0;
    const cells: CellMap = {};
    const data = s.data || [];
    for (let r = 0; r < rows; r++) {
      const row = data[r] || [];
      for (let c = 0; c < cols; c++) {
        const cell = row[c];
        const v = cell?.v ?? "";
        if (v !== "" && v !== undefined && v !== null) {
          // Build addr from c -> letters
          let n = c;
          let letters = "";
          while (n >= 0) {
            letters = String.fromCharCode((n % 26) + 65) + letters;
            n = Math.floor(n / 26) - 1;
          }
          const addr = `${letters}${r + 1}`;
          cells[addr] = String(v);
        }
      }
    }
    return {
      id: s.id || `sheet-${idx}`,
      name: s.name || `Sheet${idx + 1}`,
      rows,
      cols,
      cells,
    };
  });
}

const LuckysheetTable = forwardRef<LuckysheetTableRef, LuckysheetTableProps>(
  (
    {
      sheets,
      onSheetsChange,
      onActiveSheetIndexChange,
      className,
      assetsLoaded,
      loadingFallback,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const containerIdRef = useRef(
      `luckysheet-container-${Math.random().toString(36).slice(2)}`
    );
    const [isReady, setIsReady] = useState(false);
    const [instanceKey, setInstanceKey] = useState(0); // force remount if needed
    const [created, setCreated] = useState(false);

    // Memoize callbacks to prevent unnecessary re-renders
    const handleSheetsChange = useCallback((newSheets: SheetData[]) => {
      onSheetsChange?.(newSheets);
    }, [onSheetsChange]);

    const handleActiveSheetChange = useCallback((index: number) => {
      onActiveSheetIndexChange?.(index);
    }, [onActiveSheetIndexChange]);

    // Determine readiness from external assets
    useEffect(() => {
      const ls: any = (window as any).luckysheet;
      setIsReady(Boolean(assetsLoaded && ls && ls.create));
    }, [assetsLoaded]);

    // Initialize luckysheet only once when ready
    useEffect(() => {
      if (!isReady || !containerRef.current || created) return;
      const ls: any = (window as any).luckysheet;
      if (!ls || !ls.create) return;

      const data = toLuckysheetData(sheets);

      // Clean previous instance by clearing container
      containerRef.current.innerHTML = "";
      ls.create({
        container: "luckysheet",
        lang: "en",
        title: "Table",
        data,
        hook: {
          updated: () => {
            const current = extractSheetsFromRuntime();
            handleSheetsChange(current);
          },
          sheetActivate: (index: number) => {
            handleActiveSheetChange(index);
          },
        },
      });
      
      // Load styles - keeping this as requested
      const loadStyle = () => {
        const styles = [
          "https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/css/pluginsCss.css",
          "https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/plugins/plugins.css",
          "https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/css/luckysheet.css",
          "https://cdn.jsdelivr.net/npm/luckysheet@latest/dist/assets/iconfont/iconfont.css",
        ];
        styles.forEach((href) => {
          const link = document.createElement("link");
          link.rel = "stylesheet";
          link.href = href;
          document.head.appendChild(link);
        });
      };
      loadStyle();

      setCreated(true);
    }, [isReady, created, handleSheetsChange, handleActiveSheetChange]);

    // Handle forced recreation when instanceKey changes
    useEffect(() => {
      if (instanceKey > 0 && isReady && containerRef.current) {
        setCreated(false); // This will trigger re-creation in the above useEffect
      }
    }, [instanceKey, isReady]);

    useImperativeHandle(ref, () => ({
      applyRowsToActiveSheet: (rows: any[][]) => {
        const current = extractSheetsFromRuntime();
        // Replace active sheet cells with rows AoA
        const ls: any = (window as any).luckysheet;
        let activeIndex = 0;
        try {
          const sheet = ls?.getSheet?.();
          if (typeof sheet?.index === "number") activeIndex = sheet.index;
        } catch {}
        if (!current.length) return;

        const target = current[activeIndex] || current[0];
        const newCells: CellMap = {};
        const newRows = rows.length;
        const newCols = rows.reduce((m, r) => Math.max(m, r.length), 0);
        for (let r = 0; r < newRows; r++) {
          for (let c = 0; c < (rows[r]?.length || 0); c++) {
            // Convert c -> letters
            let n = c;
            let letters = "";
            while (n >= 0) {
              letters = String.fromCharCode((n % 26) + 65) + letters;
              n = Math.floor(n / 26) - 1;
            }
            const addr = `${letters}${r + 1}`;
            newCells[addr] = String(rows[r][c] ?? "");
          }
        }
        const nextSheets = [...current];
        nextSheets[activeIndex] = {
          ...target,
          rows: newRows,
          cols: newCols,
          cells: newCells,
        };
        // Recreate instance with new data
        onSheetsChange?.(nextSheets);
        setInstanceKey((k) => k + 1);
      },
    }));

    if (!isReady) {
      return (
        <div className={className} style={{ height: "100%", minHeight: 400 }}>
          {loadingFallback ?? (
            <div className="h-full w-full p-4 animate-pulse">
              <div className="h-6 w-40 bg-muted rounded mb-4" />
              <div className="grid grid-cols-6 gap-2">
                {Array.from({ length: 24 }).map((_, i) => (
                  <div key={i} className="h-8 bg-muted rounded" />
                ))}
              </div>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className={className} style={{ height: "100%" }}>
        <div
          id={"luckysheet"}
          ref={containerRef}
          style={{ width: "100%", height: "100%", minHeight: 400 }}
        />
      </div>
    );
  }
);

LuckysheetTable.displayName = "LuckysheetTable";

export default LuckysheetTable;
