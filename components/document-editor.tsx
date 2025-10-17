"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import TiptapEditor, { TiptapEditorRef } from "@/components/tiptap-editor";
import { CommentSidebar, Comment } from "@/components/comment-sidebar";
import AIGenerationModal from "@/components/ai-generation-modal";
import AIChatSidebar from "@/components/ai-chat-sidebar";
import "../styles/comment-styles.css";

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

interface DocumentEditorProps {
  documentId?: string;
  mode: "create" | "edit";
}

export default function DocumentEditor({ documentId, mode }: DocumentEditorProps) {
  const router = useRouter();
  const { data: session } = useSession();
  
  const [documentTitle, setDocumentTitle] = useState("Untitled Document");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [isLoading, setIsLoading] = useState(mode === "edit");
  const [showChatbot, setShowChatbot] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(documentId || null);

  // AI Generation Modal state
  const [showAIModal, setShowAIModal] = useState(false);
  const [aiGenerationType, setAIGenerationType] = useState("document");

  // Comment-related state
  const [comments, setComments] = useState<Comment[]>([]);
  const [showComments, setShowComments] = useState(false);
  const [selectedText, setSelectedText] = useState<string>("");
  const [selectedRange, setSelectedRange] = useState<{
    from: number;
    to: number;
  } | undefined>(undefined);

  const editorRef = useRef<TiptapEditorRef>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load document data for edit mode
  useEffect(() => {
    if (mode === "edit" && documentId) {
      const loadDocument = async () => {
        try {
          const response = await fetch(`/api/documents/${documentId}`);
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
            
            // Set content in editor
            if (editorRef.current?.editor) {
              editorRef.current.editor.commands.setContent(content);
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

  // Handle editor updates (auto-save)
  const handleEditorUpdate = useCallback((content: string) => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }
    
    autoSaveTimeoutRef.current = setTimeout(() => {
      handleAutoSave();
    }, 2000);
  }, []);

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

    setIsSaving(true);
    try {
      const content = editorRef.current.getHTML();
      const response = await fetch("/api/documents/save", {
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
      const response = await fetch("/api/documents/save", {
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
  const handleDownload = async () => {
    if (!currentDocumentId) return;
    
    try {
      const response = await fetch(`/api/documents/${currentDocumentId}/download`);
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `${documentTitle}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  // Send message to AI chatbot
  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage,
          context: editorRef.current?.getHTML() || "",
          type: "document_assistance",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.response,
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsTyping(false);
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

  // AI Generation handler
  const handleAIGenerate = async (prompt: string, type: string) => {
    try {
      const response = await fetch("/api/ai-generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ 
          prompt, 
          type,
          context: editorRef.current?.getHTML() || "",
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      const data = await response.json();

      // Insert the generated content into the editor
      if (editorRef.current?.editor) {
        if (mode === "create") {
          editorRef.current.editor.commands.setContent(data.content);
        } else {
          editorRef.current.editor.commands.insertContent(data.content);
        }
      }
    } catch (error) {
      console.error("AI generation failed:", error);
    }
  };

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
  const editor = editorRef.current?.editor;

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Main Editor Area */}
        <div
          className={`flex-1 flex flex-col ${
            showChatbot ? "mr-80" : ""
          } transition-all duration-300`}
        >
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
                  variant="outline"
                  size="sm"
                  onClick={() => setShowVersionHistory(true)}
                >
                  <History className="h-4 w-4 mr-2" />
                  History
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleSave}
                  disabled={isSaving}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save
                </Button>
                {mode === "edit" && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowComments(!showComments)}
                >
                  <MessageCircle className="h-4 w-4 mr-2" />
                  {showComments ? "Hide" : "Show"} Comments
                  {comments.filter((c) => !c.resolved).length > 0 && (
                    <Badge variant="secondary" className="ml-2">
                      {comments.filter((c) => !c.resolved).length}
                    </Badge>
                  )}
                </Button>
              </div>
            </div>
          </div>

          {/* Toolbar */}
          <div className="border-b p-2 bg-muted/50">
            <div className="flex items-center space-x-1 flex-wrap">
              {/* Undo/Redo */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor?.chain().focus().undo().run()}
                    disabled={!editor?.can().undo()}
                  >
                    <Undo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Undo</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => editor?.chain().focus().redo().run()}
                    disabled={!editor?.can().redo()}
                  >
                    <Redo className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Redo</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              {/* Text Formatting */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor?.isActive("bold") ? "default" : "ghost"}
                    size="sm"
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                  >
                    <Bold className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bold</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor?.isActive("italic") ? "default" : "ghost"}
                    size="sm"
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                  >
                    <Italic className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Italic</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      editor?.isActive("underline") ? "default" : "ghost"
                    }
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleUnderline().run()
                    }
                  >
                    <UnderlineIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Underline</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor?.isActive("strike") ? "default" : "ghost"}
                    size="sm"
                    onClick={() => editor?.chain().focus().toggleStrike().run()}
                  >
                    <Strikethrough className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Strikethrough</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              {/* Headings */}
              <Select
                value={
                  editor?.isActive("heading", { level: 1 })
                    ? "h1"
                    : editor?.isActive("heading", { level: 2 })
                    ? "h2"
                    : editor?.isActive("heading", { level: 3 })
                    ? "h3"
                    : editor?.isActive("heading", { level: 4 })
                    ? "h4"
                    : editor?.isActive("heading", { level: 5 })
                    ? "h5"
                    : editor?.isActive("heading", { level: 6 })
                    ? "h6"
                    : editor?.isActive("paragraph")
                    ? "p"
                    : "p"
                }
                onValueChange={(value) => {
                  if (value === "p") {
                    editor?.chain().focus().setParagraph().run();
                  } else {
                    const level = parseInt(value.replace("h", ""));
                    editor?.chain().focus().toggleHeading({ level }).run();
                  }
                }}
              >
                <SelectTrigger className="w-20 h-8">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="p">Normal</SelectItem>
                  <SelectItem value="h1">H1</SelectItem>
                  <SelectItem value="h2">H2</SelectItem>
                  <SelectItem value="h3">H3</SelectItem>
                  <SelectItem value="h4">H4</SelectItem>
                  <SelectItem value="h5">H5</SelectItem>
                  <SelectItem value="h6">H6</SelectItem>
                </SelectContent>
              </Select>

              {/* Font Family */}
              <Select
                value={
                  editor?.getAttributes("textStyle").fontFamily || "default"
                }
                onValueChange={(value) => {
                  if (value === "default") {
                    editor?.chain().focus().unsetFontFamily().run();
                  } else {
                    editor?.chain().focus().setFontFamily(value).run();
                  }
                }}
              >
                <SelectTrigger className="w-32 h-8">
                  <SelectValue placeholder="Font" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">Default</SelectItem>
                  <SelectItem value="Arial">Arial</SelectItem>
                  <SelectItem value="Helvetica">Helvetica</SelectItem>
                  <SelectItem value="Times New Roman">
                    Times New Roman
                  </SelectItem>
                  <SelectItem value="Georgia">Georgia</SelectItem>
                  <SelectItem value="Courier New">Courier New</SelectItem>
                  <SelectItem value="Verdana">Verdana</SelectItem>
                  <SelectItem value="Trebuchet MS">Trebuchet MS</SelectItem>
                </SelectContent>
              </Select>

              <Separator orientation="vertical" className="h-6" />

              {/* Alignment */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      editor?.isActive({ textAlign: "left" })
                        ? "default"
                        : "ghost"
                    }
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().setTextAlign("left").run()
                    }
                  >
                    <AlignLeft className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Left</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      editor?.isActive({ textAlign: "center" })
                        ? "default"
                        : "ghost"
                    }
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().setTextAlign("center").run()
                    }
                  >
                    <AlignCenter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Center</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      editor?.isActive({ textAlign: "right" })
                        ? "default"
                        : "ghost"
                    }
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().setTextAlign("right").run()
                    }
                  >
                    <AlignRight className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Align Right</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      editor?.isActive({ textAlign: "justify" })
                        ? "default"
                        : "ghost"
                    }
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().setTextAlign("justify").run()
                    }
                  >
                    <AlignJustify className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Justify</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              {/* Lists */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      editor?.isActive("bulletList") ? "default" : "ghost"
                    }
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleBulletList().run()
                    }
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Bullet List</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      editor?.isActive("orderedList") ? "default" : "ghost"
                    }
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleOrderedList().run()
                    }
                  >
                    <ListOrdered className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Numbered List</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              {/* Other formatting */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      editor?.isActive("blockquote") ? "default" : "ghost"
                    }
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleBlockquote().run()
                    }
                  >
                    <Quote className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Quote</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor?.isActive("code") ? "default" : "ghost"}
                    size="sm"
                    onClick={() => editor?.chain().focus().toggleCode().run()}
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Inline Code</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              {/* AI Generation */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowAIModal(true)}
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    AI Generate
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Generate content with AI</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Editor */}
          <div className="flex-1 flex">
            <div className="flex-1 p-6">
              <TiptapEditor
                ref={editorRef}
                initialContent=""
                onUpdate={handleEditorUpdate}
                onSelectionUpdate={handleSelectionUpdate}
                className="min-h-full"
              />
            </div>

            {/* Comments Sidebar */}
            {showComments && (
              <div className="w-80 border-l bg-background">
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
              </div>
            )}
          </div>
        </div>

        {/* AI Chat Sidebar */}
        <AIChatSidebar
          isVisible={showChatbot}
          onToggleVisibility={() => setShowChatbot(!showChatbot)}
          documentContent={editorRef.current?.getHTML() || ""}
        />

        {/* AI Generation Modal */}
        <AIGenerationModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          onGenerate={handleAIGenerate}
          generationType={aiGenerationType}
        />

        {/* Version History Dialog */}
        <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Version History</DialogTitle>
              <DialogDescription>
                View and restore previous versions of your document.
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-96">
              <div className="space-y-4">
                {versions.map((version) => (
                  <Card key={version.id}>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-sm">{version.title}</CardTitle>
                        <Badge variant={version.isDraft ? "secondary" : "default"}>
                          {version.isDraft ? "Draft" : "Published"}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {version.createdAt.toLocaleString()}
                      </p>
                    </CardHeader>
                    <CardContent>
                      <div
                        className="text-sm text-muted-foreground line-clamp-3"
                        dangerouslySetInnerHTML={{
                          __html: version.content.substring(0, 200) + "...",
                        }}
                      />
                      <div className="flex justify-end mt-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            if (editorRef.current?.editor) {
                              editorRef.current.editor.commands.setContent(
                                version.content
                              );
                            }
                            setShowVersionHistory(false);
                          }}
                        >
                          Restore
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
                {versions.length === 0 && (
                  <p className="text-center text-muted-foreground py-8">
                    No version history available yet.
                  </p>
                )}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}