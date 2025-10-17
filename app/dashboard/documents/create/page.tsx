"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import TiptapEditor, { TiptapEditorRef } from "@/components/tiptap-editor";
import { CommentSidebar, Comment } from "@/components/comment-sidebar";
import AIGenerationModal from "@/components/ai-generation-modal";
import "../../../../styles/comment-styles.css";

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

export default function DocumentCreatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { data: session } = useSession();
  const [documentTitle, setDocumentTitle] = useState("Untitled Document");
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [showChatbot, setShowChatbot] = useState(true);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [currentDocumentId, setCurrentDocumentId] = useState<string | null>(
    null
  );

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
  } | null>(null);

  const editorRef = useRef<TiptapEditorRef>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Handle editor updates (auto-save)
  const handleEditorUpdate = useCallback((content: string) => {
    handleAutoSave();
  }, []);

  // Handle editor selection updates
  const handleSelectionUpdate = useCallback(
    (selection: {
      text: string;
      range: { from: number; to: number } | null;
    }) => {
      setSelectedText(selection.text);
      setSelectedRange(selection.range);
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
          context: editor?.getHTML() || "",
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

  // Cleanup auto-save interval
  useEffect(() => {
    return () => {
      // Cleanup handled by TiptapEditor component
    };
  }, []);

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
        body: JSON.stringify({ prompt, type }),
      });

      if (!response.ok) {
        throw new Error("Failed to generate content");
      }

      const data = await response.json();

      // Insert the generated content into the editor
      if (editorRef.current?.editor) {
        editorRef.current.editor.commands.setContent(data.content);
      }
    } catch (error) {
      console.error("AI generation failed:", error);
      // You could add a toast notification here
    }
  };

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
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowChatbot(!showChatbot)}
                >
                  {showChatbot ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                  {showChatbot ? "Hide" : "Show"} AI
                </Button>
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

              {/* Additional Formatting */}
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
                    variant={
                      editor?.isActive("codeBlock") ? "default" : "ghost"
                    }
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleCodeBlock().run()
                    }
                  >
                    <Code className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Code Block</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      editor?.isActive("subscript") ? "default" : "ghost"
                    }
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleSubscript().run()
                    }
                  >
                    <Type className="h-3 w-3" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Subscript</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={
                      editor?.isActive("superscript") ? "default" : "ghost"
                    }
                    size="sm"
                    onClick={() =>
                      editor?.chain().focus().toggleSuperscript().run()
                    }
                  >
                    <Type className="h-3 w-3 transform -translate-y-0.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Superscript</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              {/* Color and Highlight */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const color = prompt(
                        "Enter text color (hex, rgb, or color name):"
                      );
                      if (color) {
                        editor?.chain().focus().setColor(color).run();
                      }
                    }}
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Text Color</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const color = prompt(
                        "Enter highlight color (hex, rgb, or color name):"
                      );
                      if (color) {
                        editor?.chain().focus().setHighlight({ color }).run();
                      }
                    }}
                  >
                    <Highlighter className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Highlight</TooltipContent>
              </Tooltip>

              <Separator orientation="vertical" className="h-6" />

              {/* Image and Link */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const url = prompt("Enter image URL:");
                      if (url) {
                        editor?.chain().focus().setImage({ src: url }).run();
                      }
                    }}
                  >
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Insert Image</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant={editor?.isActive("link") ? "default" : "ghost"}
                    size="sm"
                    onClick={() => {
                      const previousUrl = editor?.getAttributes("link").href;
                      const url = prompt("Enter URL:", previousUrl);
                      
                      // cancelled
                      if (url === null) {
                        return;
                      }

                      // empty
                      if (url === "") {
                        editor?.chain().focus().extendMarkRange("link").unsetLink().run();
                        return;
                      }

                      // update link
                      editor?.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
                    }}
                  >
                    <LinkIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Insert/Edit Link</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run();
                    }}
                  >
                    <TableIcon className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Insert Table</TooltipContent>
              </Tooltip>
            </div>
          </div>

          {/* Editor Content */}
          <div className="flex-1 p-8 overflow-auto">
            <div className="max-w-4xl mx-auto">
              <TiptapEditor
                ref={editorRef}
                onUpdate={handleEditorUpdate}
                onSelectionUpdate={handleSelectionUpdate}
                className="prose prose-lg max-w-none focus:outline-none min-h-[600px]"
              />
            </div>
          </div>
        </div>

        {/* Comment Sidebar */}
        {showComments && session?.user && (
          <div
            className="fixed right-0 top-0 h-full z-30"
            style={{ right: showChatbot ? "320px" : "0px" }}
          >
            <CommentSidebar
              comments={comments}
              onAddComment={handleAddComment}
              onResolveComment={handleResolveComment}
              onDeleteComment={handleDeleteComment}
              onReplyToComment={handleReplyToComment}
              currentUser={{
                id: (session.user as any).id || "anonymous",
                name: session.user.name || "Anonymous",
                email: session.user.email || "",
              }}
              selectedText={selectedText}
              selectedRange={selectedRange || undefined}
            />
          </div>
        )}

        {/* AI Chatbot Sidebar */}
        {showChatbot && (
          <div className="fixed right-0 top-0 h-full w-80 bg-background border-l flex flex-col z-40">
            {/* Chatbot Header */}
            <div className="p-4 border-b">
              <div className="flex items-center space-x-2">
                <Bot className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">AI Assistant</h3>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Get help with writing, summarizing, and improving your document
              </p>
            </div>

            {/* Messages */}
            <ScrollArea className="flex-1 p-4">
              <div className="space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-muted-foreground">
                    <Sparkles className="h-8 w-8 mx-auto mb-2" />
                    <p className="text-sm">
                      Ask me to help with your document!
                    </p>
                    <div className="mt-4 space-y-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-left justify-start"
                        onClick={() =>
                          setInputMessage("Summarize this document")
                        }
                      >
                        Summarize this document
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-left justify-start"
                        onClick={() =>
                          setInputMessage("Improve the writing style")
                        }
                      >
                        Improve the writing style
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full text-left justify-start"
                        onClick={() => setInputMessage("Generate an outline")}
                      >
                        Generate an outline
                      </Button>
                    </div>
                  </div>
                )}

                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.role === "user" ? "justify-end" : "justify-start"
                    }`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      <p className="text-sm">{message.content}</p>
                      <p className="text-xs opacity-70 mt-1">
                        {message.timestamp.toLocaleTimeString()}
                      </p>
                    </div>
                  </div>
                ))}

                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted rounded-lg p-3">
                      <div className="flex space-x-1">
                        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                        <div
                          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.1s" }}
                        ></div>
                        <div
                          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
                          style={{ animationDelay: "0.2s" }}
                        ></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            {/* Message Input */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask AI for help..."
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  disabled={isTyping}
                />
                <Button
                  size="sm"
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* Version History Dialog */}
        <Dialog open={showVersionHistory} onOpenChange={setShowVersionHistory}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Version History</DialogTitle>
              <DialogDescription>
                View and restore previous versions of your document
              </DialogDescription>
            </DialogHeader>
            <ScrollArea className="h-96">
              <div className="space-y-2">
                {versions.map((version) => (
                  <Card key={version.id} className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium">{version.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {version.createdAt.toLocaleString()}
                        </p>
                        <Badge
                          variant={version.isDraft ? "secondary" : "default"}
                        >
                          {version.isDraft ? "Draft" : "Saved"}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          editor?.commands.setContent(version.content);
                          setDocumentTitle(version.title);
                          setShowVersionHistory(false);
                        }}
                      >
                        Restore
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </DialogContent>
        </Dialog>

        {/* AI Generation Modal */}
        <AIGenerationModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          onGenerate={handleAIGenerate}
          generationType={aiGenerationType}
        />
      </div>
    </TooltipProvider>
  );
}
