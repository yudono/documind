"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import { type SuperDocEditorRef } from "@/components/superdoc/super-doc-editor";
import { CommentSidebar, Comment } from "@/components/comment-sidebar";
import AIChatSidebar from "@/components/ai-chat-sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
  RefreshCcw,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import HTMLtoDOCX from "html-to-docx";

const SuperDocEditor = dynamic(
  () => import("@/components/superdoc/super-doc-editor"),
  { ssr: false }
);

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import HistoryDialog from "@/components/history-dialog";
import { toast } from "sonner";

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
  // const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [showAiSidebar, setShowAiSidebar] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(false);

  // AI Generation Modal state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiGenerationType, setAIGenerationType] = useState("document");

  // Comment-related state
  const [comments, setComments] = useState<Comment[]>([]);
  // const [showComments, setShowComments] = useState(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState<
    | {
        from: number;
        to: number;
      }
    | undefined
  >(undefined);

  const editorRef = useRef<SuperDocEditorRef | null>(null);
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
            setDocumentItem(data);
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
  // useEffect(() => {
  //   if (mode !== "create") return;
  //   const templateId = searchParams.get("template");
  //   if (!templateId) return;

  //   const loadTemplate = async () => {
  //     try {
  //       const response = await fetch(`/api/templates/${templateId}`);
  //       if (!response.ok) {
  //         console.error("Failed to load template");
  //         return;
  //       }
  //       const data = await response.json();
  //       const tpl = data?.template ?? data;
  //       if (tpl?.name) setDocument({ ...document, name: tpl.name });
  //       const html = tpl?.html || "";
  //       setInitialHTML(html);
  //       editorRef.current?.setContent(html);
  //     } catch (error) {
  //       console.error("Error loading template:", error);
  //     }
  //   };

  //   loadTemplate();
  // }, [mode, searchParams]);

  // Handle editor updates (auto-save)
  const handleEditorUpdate = useCallback(
    (content: string) => {
      //     // Disable autosave if not enabled
      //     if (!autoSaveEnabled) {
      //       // Clear any pending autosave to prevent late triggers
      //       if (autoSaveTimeoutRef.current) {
      //         clearTimeout(autoSaveTimeoutRef.current);
      //         autoSaveTimeoutRef.current = null;
      //       }
      //       return;
      //     }
      //     if (autoSaveTimeoutRef.current) {
      //       clearTimeout(autoSaveTimeoutRef.current);
      //     }
      //     autoSaveTimeoutRef.current = setTimeout(() => {
      //       handleAutoSave();
      //     }, 2000);
    },
    [autoSaveEnabled]
  );

  // Handle editor selection updates
  // const handleSelectionUpdate = useCallback(
  //   (selection: {
  //     text: string;
  //     range: { from: number; to: number } | null;
  //   }) => {
  //     setSelectedText(selection.text);
  //     setSelectedRange(selection.range || undefined);
  //   },
  //   []
  // );

  // Stabilize onReady to avoid repeated resets
  const onReady = useCallback((api: SuperDocEditorRef) => {
    editorRef.current = api;
  }, []);

  // Comment handlers
  // const handleAddComment = useCallback(
  //   (
  //     text: string,
  //     selectedText: string,
  //     range: { from: number; to: number }
  //   ) => {
  //     if (!session?.user) return;

  //     const newComment: Comment = {
  //       id: Date.now().toString(),
  //       text,
  //       author: {
  //         id: (session.user as any).id || "anonymous",
  //         name: session.user.name || "Anonymous",
  //         email: session.user.email || "",
  //       },
  //       timestamp: new Date(),
  //       resolved: false,
  //       selectedText,
  //       range,
  //       replies: [],
  //     };
  //     setComments((prev) => [...prev, newComment]);
  //   },
  //   [session]
  // );

  // const handleResolveComment = useCallback((commentId: string) => {
  //   setComments((prev) =>
  //     prev.map((comment) =>
  //       comment.id === commentId ? { ...comment, resolved: true } : comment
  //     )
  //   );
  // }, []);

  // const handleDeleteComment = useCallback((commentId: string) => {
  //   setComments((prev) => prev.filter((comment) => comment.id !== commentId));
  // }, []);

  // const handleReplyToComment = useCallback(
  //   (commentId: string, replyText: string) => {
  //     if (!session?.user) return;

  //     const reply: Comment = {
  //       id: Date.now().toString(),
  //       text: replyText,
  //       author: {
  //         id: (session.user as any).id || "anonymous",
  //         name: session.user.name || "Anonymous",
  //         email: session.user.email || "",
  //       },
  //       timestamp: new Date(),
  //       resolved: false,
  //       selectedText: "",
  //       range: { from: 0, to: 0 },
  //       replies: [],
  //     };

  //     setComments((prev) =>
  //       prev.map((comment) =>
  //         comment.id === commentId
  //           ? {
  //               ...comment,
  //               replies: [...(comment.replies || []), reply],
  //             }
  //           : comment
  //       )
  //     );
  //   },
  //   [session]
  // );

  // Auto-save function
  // const handleAutoSave = useCallback(async () => {
  //   if (!editorRef.current || !session?.user) return;

  //   if (!documentId) return;

  //   setIsSaving(true);
  //   try {
  //     const content = editorRef.current.getHTML();
  //     const response = await fetch("/api/items/save", {
  //       method: "POST",
  //       headers: {
  //         "Content-Type": "application/json",
  //       },
  //       body: JSON.stringify({
  //         id: documentId,
  //         title: documentItem?.name,
  //         content,
  //         isDraft: true,
  //       }),
  //     });

  //     if (response.ok) {
  //       const data = await response.json();
  //       setLastSaved(new Date());
  //     }
  //   } catch (error) {
  //     console.error("Auto-save failed:", error);
  //   } finally {
  //     setIsSaving(false);
  //   }
  // }, [editorRef, document, documentId, session]);

  // Manual save function
  const handleSave = async () => {
    if (!editorRef.current || !session?.user) return;

    setIsSaving(true);
    try {
      // Ekspor menggunakan API export bawaan SuperDoc (tidak memicu download)
      const result: any = await editorRef.current.export?.({
        isFinalDoc: true,
        triggerDownload: false,
      } as any);
      const DOCX_MIME =
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
      const named = documentItem?.title.split(".")[0] || "Untitled";
      const filename = `${named}.docx`;
      const formData = new FormData();
      const docxFile = new File([result], filename, {
        type: DOCX_MIME,
      });
      formData.append("file", docxFile);

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

      const response = await fetch("/api/items/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: documentId,
          title: documentItem?.title || "Untitled",
          content: "", // tidak pakai exportHtml; kita simpan file DOCX hasil edit
          url: uploadedUrl,
          key: uploadKey,
          type: "document",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success("Document saved successfully");

        // setLastSaved(new Date());
        // Add to version history
        // const newVersion: DocumentVersion = {
        //   id: data.id,
        //   title: documentItem?.name || "Untitled",
        //   content,
        //   createdAt: new Date(),
        //   isDraft: false,
        // };
        // setVersions((prev) => [newVersion, ...prev]);
      } else {
        throw new Error(await response.text());
      }
    } catch (error) {
      toast.error("Save failed");
      // console.error("Save failed:", error);
    } finally {
      setIsSaving(false);
    }
  };

  // Download functionality
  // const handleExport = async (type: "docx" | "pdf") => {
  //   if (!documentId) return;

  //   try {
  //     const response = await fetch(
  //       `/api/items/${documentId}/download?type=${type}`
  //     );
  //     if (response.ok) {
  //       const blob = await response.blob();
  //       const url = window.URL.createObjectURL(blob);
  //       const a = document.createElement("a");
  //       a.style.display = "none";
  //       a.href = url;
  //       a.download = `${documentItem?.name || "Untitled"}.${type}`;
  //       document.body.appendChild(a);
  //       a.click();
  //       window.URL.revokeObjectURL(url);
  //       document.body.removeChild(a);
  //     }
  //   } catch (error) {
  //     console.error("Download failed:", error);
  //   }
  // };

  // Scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

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
                value={documentItem?.title}
                onChange={(e) =>
                  setDocumentItem((prev) =>
                    prev
                      ? { ...prev, title: e.target.value || "Untitled" }
                      : {
                          id: documentId,
                          title: e.target.value || "Untitled",
                          content: "",
                          url: "",
                          key: "",
                          type: "document",
                        }
                  )
                }
                className="text-lg font-semibold border-none bg-transparent px-0 focus-visible:ring-0"
                placeholder="Document title..."
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
              {/* <Button
                variant="link"
                className="text-muted-foreground"
                size="sm"
                onClick={() => {
                  setShowVersionHistory(true);
                }}
              >
                <History className="h-4 w-4" />
              </Button> */}
              {/* <Button
                variant="link"
                className="text-muted-foreground"
                size="sm"
                onClick={() => {
                  const next = !showComments;
                  setShowComments(next);
                  if (next) setShowAiSidebar(false);
                }}
              >
                <MessageCircle className="h-4 w-4" />
              </Button> */}
              {/* AI Toggle Button moved from AIChatSidebar */}
              <Button
                variant="link"
                className="text-muted-foreground"
                size="sm"
                onClick={() => {
                  setShowAiSidebar(!showAiSidebar);
                }}
              >
                <Sparkles className="h-4 w-4" />
              </Button>
              {/* {mode === "edit" && (
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
              )} */}
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
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

        {/* Main Content: Editor + Sidebars */}
        <div className="flex flex-row">
          {/* Editor column */}
          <div
            className={cn(
              "flex-1 h-[calc(100vh-74px)]",
              showAiSidebar ? "w-[calc(100vw-600px)]" : " w-[calc(100vw-260px)]"
            )}
          >
            <div id="superdoc-toolbar" className="border-b w-full px-6" />
            <div className="h-[calc(100vh-114px)] overflow-auto">
              {(() => {
                const DOCX_MIME =
                  "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
                const urlVal = documentItem?.url as string | undefined;
                const isStringUrl =
                  typeof urlVal === "string" && urlVal.length > 0;
                const looksDocx = isStringUrl
                  ? urlVal.toLowerCase().endsWith(".docx")
                  : false;
                const mimeIsDocx = documentItem?.fileType === DOCX_MIME;
                const docxUrl = looksDocx || mimeIsDocx ? urlVal : undefined;

                return <SuperDocEditor document={docxUrl} onReady={onReady} />;
              })()}
            </div>
          </div>

          {/* Sidebar column */}
          <div
            className={cn(
              "w-80 border-l bg-background flex flex-col",
              !showAiSidebar && "hidden"
            )}
          >
            {/* <AIChatSidebar
              isVisible={true}
              onToggleVisibility={() => setShowAiSidebar(false)}
              documentContent={editorRef.current?.getHTML() || ""}
              inline={true}
              onApplyHtml={applyGeneratedHtml}
              documentId={documentId}
            /> */}
            {/* {showComments ? (
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
            ) : showAiSidebar ? (
              <AIChatSidebar
                isVisible={true}
                onToggleVisibility={() => setShowAiSidebar(false)}
                documentContent={editorRef.current?.getHTML() || ""}
                inline={true}
                onApplyHtml={applyGeneratedHtml}
                documentId={documentId}
              />
            ) : null} */}
          </div>
        </div>
      </div>
      {/* Version History Dialog */}
      {/* <HistoryDialog
        open={showVersionHistory}
        onOpenChange={setShowVersionHistory}
        versions={versions}
        onRestore={(versionContent) => {
          if (editorRef.current) {
            editorRef.current.setContent(versionContent);
          }
          setShowVersionHistory(false);
        }}
      /> */}
    </div>
  );
}
