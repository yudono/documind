"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { ChatMessage } from "@/components/chat/types";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";
import * as XLSX from "xlsx";
import { useSession } from "next-auth/react";
// REMOVE prisma-based client import
// import { getOrCreateDocumentSession } from '@/lib/session-utils';

interface AIChatSidebarTablesProps {
  isVisible: boolean;
  inline?: boolean;
  onApplyTable: (rows: any[][]) => void;
  tableId?: string;
  contextRows?: any[][]; // optional: current sheet rows for context
}

export default function AIChatSidebarTables({
  isVisible,
  inline = false,
  onApplyTable,
  tableId,
  contextRows,
}: AIChatSidebarTablesProps) {
  const { data: session } = useSession();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [previewRows, setPreviewRows] = useState<any[][] | null>(null);
  // Removed format state, default to CSV behavior
  // const [format, setFormat] = useState<"json" | "csv">("json");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionStorageKey = tableId
    ? `chatSession:tables:${tableId}`
    : "chatSession:tables";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const createSession = useCallback(async () => {
    try {
      const response = await fetch("/api/chat-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "AI Tables Sidebar",
          documentId: tableId,
          type: "tables_sidebar",
        }),
      });
      if (!response.ok) throw new Error("Failed to create chat session");
      const data = await response.json();
      const id = data.chatSession?.id || data.id;
      setSessionId(id);
      try {
        localStorage.setItem(sessionStorageKey, id);
      } catch {}
      return id;
    } catch (error) {
      console.error("Failed to create session:", error);
      return null;
    }
  }, [tableId, sessionStorageKey]);

  const loadSessionMessages = useCallback(async (id: string) => {
    try {
      const res = await fetch(`/api/chat-messages?sessionId=${id}`);
      if (!res.ok) return;
      const data = await res.json();
      const loaded: ChatMessage[] = (data.messages || []).map((msg: any) => ({
        id: msg.id,
        content: msg.content,
        role: msg.role,
        timestamp: new Date(msg.createdAt),
      }));
      setMessages(loaded);
    } catch (error) {
      console.error("Failed to load session messages:", error);
    }
  }, []);

  const restoreOrCreateSession = useCallback(async (): Promise<
    string | null
  > => {
    // Try localStorage first
    try {
      const stored = localStorage.getItem(sessionStorageKey);
      if (stored) {
        setSessionId(stored);
        await loadSessionMessages(stored);
        return stored;
      }
    } catch {}

    // Try to fetch existing session by documentId if available
    if (tableId) {
      try {
        const res = await fetch(
          `/api/chat-sessions?documentId=${tableId}&type=tables_sidebar`
        );
        if (res.ok) {
          const data = await res.json();
          const existing =
            data.chatSessions?.[0]?.id || data.chatSession?.id || data.id;
          if (existing) {
            setSessionId(existing);
            try {
              localStorage.setItem(sessionStorageKey, existing);
            } catch {}
            await loadSessionMessages(existing);
            return existing;
          }
        }
      } catch (err) {
        console.error("Failed to restore existing session:", err);
      }
    }

    // Create new if none found
    const created = await createSession();
    if (created) {
      await loadSessionMessages(created);
      return created;
    }
    return null;
  }, [sessionStorageKey, tableId, loadSessionMessages, createSession]);

  useEffect(() => {
    if (!isVisible) return; // avoid initializing when hidden
    let mounted = true;
    (async () => {
      const id = await restoreOrCreateSession();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, [restoreOrCreateSession, isVisible]);

  const extractCodeBlock = (
    text: string
  ): { lang?: string; content: string } | null => {
    if (!text) return null;
    const match = text.match(/```(\w+)?\n([\s\S]*?)```/);
    if (match) {
      return { lang: match[1]?.toLowerCase(), content: match[2].trim() };
    }
    return null;
  };

  const parseRowsFromContent = (
    lang: string | undefined,
    content: string
  ): any[][] | null => {
    try {
      // Prefer JSON only if AI explicitly returned a json code block
      if (lang === "json") {
        const json = JSON.parse(content);
        if (Array.isArray(json)) {
          // array of arrays or array of objects
          if (json.length && Array.isArray(json[0])) return json as any[][];
          if (json.length && typeof json[0] === "object") {
            const headers = Object.keys(json[0]);
            const rows = json.map((obj: any) =>
              headers.map((h) => obj[h] ?? "")
            );
            return [headers, ...rows];
          }
        } else if (
          json &&
          (json as any).rows &&
          Array.isArray((json as any).rows)
        ) {
          return (json as any).rows as any[][];
        }
      }
      // Default to CSV parsing
      const wb = XLSX.read(content, { type: "string" });
      const firstSheet = wb.Sheets[wb.SheetNames[0]];
      const rows: any[][] = XLSX.utils.sheet_to_json(firstSheet, { header: 1 });
      return rows;
    } catch (err) {
      console.error("Failed to parse content:", err);
      return null;
    }
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await restoreOrCreateSession();
      if (!currentSessionId) return;
      setSessionId(currentSessionId);
    }

    setIsTyping(true);
    setPreviewRows(null);

    // Always ask for CSV output wrapped in triple backticks
    const instruction =
      "Please respond ONLY with CSV content representing a table. Include headers as the first row. Wrap in triple backticks with csv.";

    const context = contextRows
      ? `\nContext (first 5 rows):\n${JSON.stringify(contextRows.slice(0, 5))}`
      : "";

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: `${inputMessage}\n\n${instruction}${context}`,
          context: undefined,
          documentRequest: false,
          sessionId: currentSessionId,
          type: "tables_assistance",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message to AI");
      }

      const data = await response.json();
      const text = data.response || data.message || "";
      const block = extractCodeBlock(text);
      const rows = block
        ? parseRowsFromContent(block.lang, block.content)
        : parseRowsFromContent(undefined, text);
      if (rows && rows.length) {
        setPreviewRows(rows);
      }
      await loadSessionMessages(currentSessionId);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsTyping(false);
      setInputMessage("");
    }
  };

  const applyPreview = () => {
    if (previewRows && onApplyTable) {
      onApplyTable(previewRows);
      setPreviewRows(null);
    }
  };

  const cancelPreview = () => {
    setPreviewRows(null);
  };

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="flex items-center text-lg">
          <Bot className="h-5 w-5 mr-2 text-blue-600" />
          AI Assistant (Tables)
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col p-0 h-[calc(100vh-134px)]">
        {/* Removed output format selector */}

        <div className="flex-1 overflow-y-auto px-4">
          <ChatMessageList messages={messages} />
          <div ref={messagesEndRef} />
        </div>

        {previewRows && (
          <div className="border-t p-3 bg-muted/30">
            <div className="text-xs font-semibold mb-2">Preview</div>
            <div className="max-h-40 overflow-auto border rounded bg-background">
              <table className="w-full text-xs">
                <tbody>
                  {previewRows.slice(0, 10).map((row, i) => (
                    <tr key={i} className="border-b">
                      {row.map((cell, j) => (
                        <td key={j} className="px-2 py-1 border-r">
                          {String(cell ?? "")}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="default" onClick={applyPreview}>
                Apply to sheet
              </Button>
              <Button size="sm" variant="secondary" onClick={cancelPreview}>
                Cancel
              </Button>
            </div>
          </div>
        )}

        <div className="border-t p-2">
          <ChatInput
            value={inputMessage}
            onChange={setInputMessage}
            onSend={sendMessage}
            disabled={isTyping}
          />
          <div className="px-3 pb-2 text-[11px] text-muted-foreground">
            Tips: Minta AI kirim dalam format CSV terbungkus triple backticks.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
