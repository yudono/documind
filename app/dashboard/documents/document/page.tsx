"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import { SimpleEditor } from "@/components/tiptap-templates/simple/simple-editor";
import type { Editor as TiptapEditor } from "@tiptap/react";
import { CommentSidebar, Comment } from "@/components/comment-sidebar";
import AIGenerationModal from "@/components/ai-generation-modal";
import AIChatSidebar from "@/components/ai-chat-sidebar";
// import "../styles/comment-styles.css";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import {
  Save,
  FileText,
  Bot,
  Send,
  History,
  Undo,
  Redo,
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  List,
  ListOrdered,
  Quote,
  Code,
  Link as LinkIcon,
  Image as ImageIcon,
  Table as TableIcon,
  Palette,
  Type,
  Highlighter,
  Clock,
  MessageSquare,
  MessageCircle,
  Sparkles,
  ArrowLeft,
  Download,
  Share,
  Settings,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import HistoryDialog from "@/components/history-dialog";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isTyping?: boolean;
}

interface DocumentVersion {
  id: string;
  title: string;
  content: string;
  createdAt: Date;
  isDraft: boolean;
}

export default function CreateDocumentPage() {
  const router = useRouter();
  const { data: session } = useSession();
  const searchParams = useSearchParams();

  const documentId = searchParams.get("id") as string;
  const mode = !!documentId ? "edit" : "create";

  const [documentTitle, setDocumentTitle] = useState("Untitled Document");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [initialHTML, setInitialHTML] = useState<string>("");
  const [showChatbot, setShowChatbot] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(
    documentId || null
  );
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

  // AI Generation Modal state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiGenerationType, setAIGenerationType] = useState("document");

  // Comment-related state
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState<
    | {
        from: number;
        to: number;
      }
    | undefined
  >(undefined);

  const editorRef = useRef<TiptapEditor | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    // Clear pending autosave when disabling
    if (!autoSaveEnabled && autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
      autoSaveTimeoutRef.current = null;
    }
  }, [autoSaveEnabled]);

  // Load document data for edit mode
  useEffect(() => {
    if (mode === "edit" && documentId) {
      const loadDocument = async () => {
        try {
          const response = await fetch(`/api/items/${documentId}`);
          if (response.ok) {
            const data = await response.json();
            setDocumentTitle(data.name || "Untitled Document");

            // Parse content if it's JSON string
            let content = "";
            if (data.content) {
              try {
                const parsedContent = JSON.parse(data.content);
                content = parsedContent.html || data.content;
              } catch {
                content = data.content;
              }
            }

            // Set initialHTML for SimpleEditor
            setInitialHTML(content);

            // Set content in editor
            if (editorRef.current) {
              editorRef.current.commands.setContent(content);
            }
          } else {
            console.error("Failed to load document");
            router.push("/dashboard/documents");
          }
        } catch (error) {
          console.error("Error loading document:", error);
          router.push("/dashboard/documents");
        } finally {
          setIsLoading(false);
        }
      };

      loadDocument();
    }
  }, [documentId, mode, router]);

  // Load template for create mode from query param
  useEffect(() => {
    if (mode !== "create") return;
    const templateId = searchParams.get("template");
    if (!templateId) return;

    const loadTemplate = async () => {
      try {
        const response = await fetch(`/api/templates/${templateId}`);
        if (!response.ok) {
          console.error("Failed to load template");
          return;
        }
        const data = await response.json();
        const tpl = data?.template ?? data;
        if (tpl?.name) setDocumentTitle(tpl.name);
        const html = tpl?.html || "";
        setInitialHTML(html);
        if (editorRef.current) {
          editorRef.current.commands.setContent(html);
        }
      } catch (error) {
        console.error("Error loading template:", error);
      }
    };

    loadTemplate();
  }, [mode, searchParams]);

  // Handle editor updates (auto-save)
  const handleEditorUpdate = useCallback(
    (content: string) => {
      // Disable autosave if not enabled
      if (!autoSaveEnabled) {
        // Clear any pending autosave to prevent late triggers
        if (autoSaveTimeoutRef.current) {
          clearTimeout(autoSaveTimeoutRef.current);
          autoSaveTimeoutRef.current = null;
        }
        return;
      }

      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 2000);
    },
    [autoSaveEnabled]
  );

  // Handle editor selection updates
  const handleSelectionUpdate = useCallback(
    (selection: {
      text: string;
      range: { from: number; to: number } | null;
    }) => {
      setSelectedText(selection.text);
      setSelectedRange(selection.range || undefined);
    },
    []
  );

  // Stabilize onEditorReady to avoid repeated resets
  const onEditorReady = useCallback(
    (editorInstance: TiptapEditor) => {
      editorRef.current = editorInstance;

      const onUpdate = () => {
        const html = editorInstance.getHTML();
        handleEditorUpdate(html);
      };

      const onSelection = () => {
        const { from, to } = editorInstance.state.selection;
        const selected = editorInstance.state.doc.textBetween(from, to, "\n");
        setSelectedText(selected);
        setSelectedRange(from !== to ? { from, to } : undefined);
      };

      editorInstance.on("update", onUpdate);
      editorInstance.on("selectionUpdate", onSelection);
      // Do NOT reset content here; SimpleEditor initializes and loadDocument sets content.
    },
    [handleEditorUpdate]
  );

  // Comment handlers
  const handleAddComment = useCallback(
    (
      text: string,
      selectedText: string,
      range: { from: number; to: number }
    ) => {
      if (!session?.user) return;

      const newComment: Comment = {
        id: Date.now().toString(),
        text,
        author: {
          id: (session.user as any).id || "anonymous",
          name: session.user.name || "Anonymous",
          email: session.user.email || "",
        },
        timestamp: new Date(),
        resolved: false,
        selectedText,
        range,
        replies: [],
      };
      setComments((prev) => [...prev, newComment]);
    },
    [session]
  );

  const handleResolveComment = useCallback((commentId: string) => {
    setComments((prev) =>
      prev.map((comment) =>
        comment.id === commentId ? { ...comment, resolved: true } : comment
      )
    );
  }, []);

  const handleDeleteComment = useCallback((commentId: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
  }, []);

  const handleReplyToComment = useCallback(
    (commentId: string, replyText: string) => {
      if (!session?.user) return;

      const reply: Comment = {
        id: Date.now().toString(),
        text: replyText,
        author: {
          id: (session.user as any).id || "anonymous",
          name: session.user.name || "Anonymous",
          email: session.user.email || "",
        },
        timestamp: new Date(),
        resolved: false,
        selectedText: "",
        range: { from: 0, to: 0 },
        replies: [],
      };

      setComments((prev) =>
        prev.map((comment) =>
          comment.id === commentId
            ? {
                ...comment,
                replies: [...(comment.replies || []), reply],
              }
            : comment
        )
      );
    },
    [session]
  );

  // Auto-save function
  const handleAutoSave = useCallback(async () => {
    if (!editorRef.current || !session?.user) return;

    if (!currentDocumentId) return;

    setIsSaving(true);
    try {
      const content = editorRef.current.getHTML();
      const response = await fetch("/api/items/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: currentDocumentId,
          title: documentTitle,
          content,
          isDraft: true,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (!currentDocumentId) {
          setCurrentDocumentId(data.id);
        }
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [editorRef, documentTitle, currentDocumentId, session]);

  // Manual save function
  const handleSave = async () => {
    if (!editorRef.current || !session?.user) return;

    setIsSaving(true);
    try {
      const content = editorRef.current.getHTML();
      const response = await fetch("/api/items/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: currentDocumentId,
          title: documentTitle,
          content,
          isDraft: false,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (!currentDocumentId) {
          setCurrentDocumentId(data.id);
        }
        setLastSaved(new Date());
        // Add to version history
        const newVersion: DocumentVersion = {
          id: data.id,
          title: documentTitle,
          content,
          createdAt: new Date(),
          isDraft: false,
        };
        setVersions((prev) => [newVersion, ...prev]);
      }
    } catch (error) {
      console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Download functionality
  const handleExport = async (type: "docx" | "pdf") => {
    if (!currentDocumentId) return;

    try {
      const response = await fetch(
        `/api/items/${currentDocumentId}/download?type=${type}`
      );
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.style.display = "none";
        a.href = url;
        a.download = `${documentTitle}.${type}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // AI Generation event listener
  useEffect(() => {
    const handleAIGeneration = (event: CustomEvent) => {
      const { type } = event.detail;
      setAIGenerationType(type);
      setShowAIModal(true);
    };

    window.addEventListener(
      "openAIGeneration",
      handleAIGeneration as EventListener
    );

    return () => {
      window.removeEventListener(
        "openAIGeneration",
        handleAIGeneration as EventListener
      );
    };
  }, []);

  // Apply generated HTML into the editor (used by AIChatSidebar)
  const applyGeneratedHtml = useCallback((html: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    editor.chain().focus().insertContent(html).run();
  }, []);

  // Navigation handler
  const handleBack = () => {
    if (mode === "create") {
      router.back();
    } else {
      router.push("/dashboard/documents");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  // Get editor instance for toolbar functionality
  const editor = editorRef.current;

  // console.log("rerender");

  return (
    <TooltipProvider>
      <div className="h-screen bg-background">
        {/* Main Editor Area */}
        <div className={`flex-1 flex flex-col transition-all duration-300`}>
          {/* Header */}
          <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <Button variant="ghost" size="sm" onClick={handleBack}>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
                <Input
                  value={documentTitle}
                  onChange={(e) => setDocumentTitle(e.target.value)}
                  className="text-lg font-semibold border-none bg-transparent px-0 focus-visible:ring-0"
                  placeholder="Document title..."
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
                  onClick={() => {
                    setShowVersionHistory(true);
                  }}
                >
                  <History className="h-4 w-4" />
                </Button>
                <Button
                  variant="link"
                  className="text-muted-foreground"
                  size="sm"
                  onClick={() => {
                    const next = !showComments;
                    setShowComments(next);
                    if (next) setShowChatbot(false);
                  }}
                >
                  <MessageCircle className="h-4 w-4" />
                </Button>
                {/* AI Toggle Button moved from AIChatSidebar */}
                <Button
                  variant="link"
                  className="text-muted-foreground"
                  size="sm"
                  onClick={() => {
                    const next = !showChatbot;
                    setShowChatbot(next);
                    if (next) setShowComments(false);
                  }}
                >
                  <Sparkles className="h-4 w-4" />
                </Button>
                {mode === "edit" && (
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" size="sm">
                        <Download className="h-4 w-4 mr-2" />
                        Export
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleExport("docx")}>
                        DOCX
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleExport("pdf")}>
                        PDF
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content: Editor + Sidebars */}
          <div className="flex flex-row">
            {/* Editor column */}
            <div className="flex-1 h-[calc(100vh-74px)] overflow-auto">
              <SimpleEditor
                initialHTML={initialHTML}
                onEditorReady={onEditorReady}
              />
            </div>

            {/* Sidebar column */}
            <div
              className={cn(
                "w-80 border-l bg-background flex flex-col",
                !showComments && !showChatbot && "hidden"
              )}
            >
              {showComments ? (
                <CommentSidebar
                  comments={comments}
                  onAddComment={handleAddComment}
                  onResolveComment={handleResolveComment}
                  onDeleteComment={handleDeleteComment}
                  onReplyToComment={handleReplyToComment}
                  currentUser={{
                    id: (session?.user as any)?.id || "anonymous",
                    name: session?.user?.name || "Anonymous",
                    email: session?.user?.email || "",
                  }}
                  selectedText={selectedText}
                  selectedRange={selectedRange}
                />
              ) : showChatbot ? (
                <AIChatSidebar
                  isVisible={true}
                  onToggleVisibility={() => setShowChatbot(false)}
                  documentContent={editorRef.current?.getHTML() || ""}
                  inline={true}
                  onApplyHtml={applyGeneratedHtml}
                  documentId={documentId}
                />
              ) : null}
            </div>
          </div>
        </div>
        {/* Version History Dialog */}
        <HistoryDialog
          open={showVersionHistory}
          onOpenChange={setShowVersionHistory}
          versions={versions}
          onRestore={(versionContent) => {
            if (editorRef.current) {
              editorRef.current.commands.setContent(versionContent);
            }
            setShowVersionHistory(false);
          }}
        />
      </div>
    </TooltipProvider>
  );
}
