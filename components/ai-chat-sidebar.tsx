"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bot } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

import type { ChatMessage } from "@/components/chat/types";
import { ChatMessageList } from "@/components/chat/ChatMessageList";
import { ChatInput } from "@/components/chat/ChatInput";

interface AIChatSidebarProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
  documentContent?: string;
  inline?: boolean;
  onApplyHtml?: (html: string) => void;
  documentId?: string;
}

export default function AIChatSidebar({
  isVisible,
  onToggleVisibility,
  documentContent = "",
  inline = false,
  onApplyHtml,
  documentId,
}: AIChatSidebarProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const sessionStorageKey = documentId
    ? `chatSession:${documentId}`
    : "chatSession:sidebar";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Create a dedicated chat session for the sidebar on mount
  const createSession = useCallback(async () => {
    try {
      const response = await fetch("/api/chat-sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: "AI Assistant Sidebar",
          documentId,
          type: "document_sidebar",
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
  }, [documentId, sessionStorageKey]);

  // Load messages for the current session
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
    if (documentId) {
      try {
        const res = await fetch(
          `/api/chat-sessions?documentId=${documentId}&type=document_sidebar`
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
  }, [sessionStorageKey, documentId, loadSessionMessages, createSession]);

  // Initialize session and history
  useEffect(() => {
    if (!isVisible) return; // only initialize when visible
    let mounted = true;
    (async () => {
      const id = await restoreOrCreateSession();
      if (!mounted) return;
    })();
    return () => {
      mounted = false;
    };
  }, [restoreOrCreateSession, isVisible]);

  const extractHtmlFromResponse = (text: string): string | null => {
    if (!text) return null;
    // Remove code fences if present
    const cleaned = text.replace(/^```[a-zA-Z]*\n?|```$/g, "").trim();
    // Detect basic HTML presence
    const hasHtml =
      /<\s*(p|h1|h2|h3|h4|h5|div|ul|ol|li|table|thead|tbody|tr|td|th|blockquote|pre|code)[^>]*>/i.test(
        cleaned
      );
    return hasHtml ? cleaned : null;
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    // Ensure we have a session
    let currentSessionId = sessionId;
    if (!currentSessionId) {
      currentSessionId = await restoreOrCreateSession();
      if (!currentSessionId) return; // cannot proceed without session
      setSessionId(currentSessionId);
    }

    setIsTyping(true);
    setPreviewHtml(null);

    try {
      // Send via unified chat API (handles credits, embeddings, session history)
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: inputMessage,
          context: documentContent || undefined,
          documentRequest: false,
          sessionId: currentSessionId,
          type: "document_assistance",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message to AI");
      }

      const data = await response.json();

      // Try to extract HTML preview from AI response
      const html = extractHtmlFromResponse(data.response || data.message || "");
      if (html) {
        setPreviewHtml(html);
      }

      // Refresh messages from server to avoid duplicates
      await loadSessionMessages(currentSessionId);
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsTyping(false);
      setInputMessage("");
    }
  };

  const applyPreview = () => {
    if (previewHtml && onApplyHtml) {
      onApplyHtml(previewHtml);
      setPreviewHtml(null);
    }
  };

  const cancelPreview = () => {
    setPreviewHtml(null);
  };

  return (
    <Card>
      <CardHeader className="py-4">
        <CardTitle className="flex items-center text-lg">
          <Bot className="h-5 w-5 mr-2 text-blue-600" />
          AI Assistant
        </CardTitle>
      </CardHeader>

      <CardContent className="flex flex-col p-0 h-[calc(100vh-134px)]">
        <div className="flex-1 overflow-y-auto px-4">
          <ChatMessageList messages={messages} />
          <div ref={messagesEndRef} />
        </div>

        {previewHtml && (
          <div className="border-t p-3 bg-muted/30">
            <div className="text-xs font-semibold mb-2">Preview</div>
            <div className="max-h-40 overflow-auto border rounded bg-background p-3 text-xs">
              <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
            </div>
            <div className="flex gap-2 mt-2">
              <Button size="sm" variant="default" onClick={applyPreview}>
                Apply to document
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
            Tips: Minta AI kirim HTML sederhana bila perlu preview.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
