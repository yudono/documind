"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import {
  TooltipProvider,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Download,
  Share2,
  MessageSquare,
  Send,
  X,
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  Quote,
  Code,
  Subscript,
  Superscript,
  Palette,
  Highlighter,
  Undo,
  Redo,
  Image,
  Link,
  Table,
  ArrowLeft,
  Loader2,
} from "lucide-react";
import TiptapEditor, { TiptapEditorRef } from "@/components/tiptap-editor";
import AIGenerationModal from "@/components/ai-generation-modal";

interface Comment {
  id: string;
  content: string;
  author: string;
  timestamp: string;
  resolved: boolean;
}

interface Message {
  id: string;
  content: string;
  sender: string;
  timestamp: string;
  isUser: boolean;
}

export default function EditDocumentPage() {
  const params = useParams();
  const router = useRouter();
  const documentId = params.documentId as string;

  const [documentTitle, setDocumentTitle] = useState("");
  const [documentContent, setDocumentContent] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [showComments, setShowComments] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [showAIModal, setShowAIModal] = useState(false);
  const [generationType, setGenerationType] = useState<
    "continue" | "improve" | "summarize" | "expand"
  >("continue");

  const editorRef = useRef<any>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Load document data
  useEffect(() => {
    const loadDocument = async () => {
      try {
        const response = await fetch(`/api/documents/${documentId}`);
        if (response.ok) {
          const document = await response.json();
          setDocumentTitle(document.name || "");
          setDocumentContent(document.content || "");
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

    if (documentId) {
      loadDocument();
    }
  }, [documentId, router]);

  // Auto-save functionality
  const handleAutoSave = useCallback(async () => {
    if (!documentId || !documentTitle.trim()) return;

    try {
      setIsSaving(true);
      const response = await fetch("/api/documents/save", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: documentId,
          name: documentTitle,
          content: documentContent,
        }),
      });

      if (response.ok) {
        setLastSaved(new Date());
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    } finally {
      setIsSaving(false);
    }
  }, [documentId, documentTitle, documentContent]);

  // Trigger auto-save on content changes
  useEffect(() => {
    if (autoSaveTimeoutRef.current) {
      clearTimeout(autoSaveTimeoutRef.current);
    }

    autoSaveTimeoutRef.current = setTimeout(() => {
      handleAutoSave();
    }, 2000);

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [documentContent, documentTitle, handleAutoSave]);

  const handleSave = async () => {
    await handleAutoSave();
  };

  const handleDownload = () => {
    const element = document.createElement("a");
    const file = new Blob([documentContent], { type: "text/plain" });
    element.href = URL.createObjectURL(file);
    element.download = `${documentTitle || "document"}.docx`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleAddComment = () => {
    if (newComment.trim()) {
      const comment: Comment = {
        id: Date.now().toString(),
        content: newComment,
        author: "You",
        timestamp: new Date().toLocaleTimeString(),
        resolved: false,
      };
      setComments([...comments, comment]);
      setNewComment("");
    }
  };

  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        content: newMessage,
        sender: "You",
        timestamp: new Date().toLocaleTimeString(),
        isUser: true,
      };
      setMessages([...messages, message]);
      setNewMessage("");
    }
  };

  const handleAIGenerate = async (prompt: string, type: string) => {
    try {
      const response = await fetch("/api/ai/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          type,
          context: documentContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        if (editorRef.current) {
          editorRef.current.commands.insertContent(data.content);
        }
      }
    } catch (error) {
      console.error("AI generation failed:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push("/dashboard/documents")}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Documents
              </Button>
              <Input
                value={documentTitle}
                onChange={(e) => setDocumentTitle(e.target.value)}
                placeholder="Document title..."
                className="text-xl font-semibold border-none shadow-none focus-visible:ring-0 px-0"
              />
            </div>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-2 text-sm text-gray-500">
                {isSaving ? (
                  <div className="flex items-center">
                    <Loader2 className="h-3 w-3 animate-spin mr-1" />
                    Saving...
                  </div>
                ) : lastSaved ? (
                  <span>Saved {lastSaved.toLocaleTimeString()}</span>
                ) : null}
              </div>
              <Button variant="outline" size="sm" onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button variant="outline" size="sm">
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowComments(!showComments)}
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Comments
              </Button>
            </div>
          </div>
        </div>

        {/* Editor Container */}
        <div className="flex-1 flex">
          {/* Editor */}
          <div className="flex-1 flex flex-col">
            {/* Toolbar */}
            <div className="bg-white border-b border-gray-200 px-6 py-2">
              <div className="flex items-center space-x-1">
                <TooltipProvider>
                  {/* Undo/Redo */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current?.chain().focus().undo().run()
                        }
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
                        onClick={() =>
                          editorRef.current?.chain().focus().redo().run()
                        }
                      >
                        <Redo className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Redo</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="h-6 mx-2" />

                  {/* Text Formatting */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current?.chain().focus().toggleBold().run()
                        }
                      >
                        <Bold className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Bold</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current
                            ?.chain()
                            .focus()
                            .toggleItalic()
                            .run()
                        }
                      >
                        <Italic className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Italic</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current
                            ?.chain()
                            .focus()
                            .toggleUnderline()
                            .run()
                        }
                      >
                        <Underline className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Underline</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current
                            ?.chain()
                            .focus()
                            .toggleStrike()
                            .run()
                        }
                      >
                        <Strikethrough className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Strikethrough</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="h-6 mx-2" />

                  {/* Heading Selector */}
                  <Select
                    onValueChange={(value) => {
                      if (value === "paragraph") {
                        editorRef.current?.chain().focus().setParagraph().run();
                      } else {
                        const level = parseInt(value.replace("h", ""));
                        editorRef.current
                          ?.chain()
                          .focus()
                          .toggleHeading({ level })
                          .run();
                      }
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Normal" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paragraph">Normal</SelectItem>
                      <SelectItem value="h1">Heading 1</SelectItem>
                      <SelectItem value="h2">Heading 2</SelectItem>
                      <SelectItem value="h3">Heading 3</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Font Family Selector */}
                  <Select
                    onValueChange={(value) => {
                      editorRef.current
                        ?.chain()
                        .focus()
                        .setFontFamily(value)
                        .run();
                    }}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Font" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Inter">Inter</SelectItem>
                      <SelectItem value="Comic Sans MS, Comic Sans">
                        Comic Sans
                      </SelectItem>
                      <SelectItem value="serif">Serif</SelectItem>
                      <SelectItem value="monospace">Monospace</SelectItem>
                      <SelectItem value="cursive">Cursive</SelectItem>
                    </SelectContent>
                  </Select>

                  <Separator orientation="vertical" className="h-6 mx-2" />

                  {/* Alignment */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current
                            ?.chain()
                            .focus()
                            .setTextAlign("left")
                            .run()
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
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current
                            ?.chain()
                            .focus()
                            .setTextAlign("center")
                            .run()
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
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current
                            ?.chain()
                            .focus()
                            .setTextAlign("right")
                            .run()
                        }
                      >
                        <AlignRight className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Align Right</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="h-6 mx-2" />

                  {/* Lists */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current
                            ?.chain()
                            .focus()
                            .toggleBulletList()
                            .run()
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
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current
                            ?.chain()
                            .focus()
                            .toggleOrderedList()
                            .run()
                        }
                      >
                        <ListOrdered className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Numbered List</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="h-6 mx-2" />

                  {/* Additional Formatting */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current
                            ?.chain()
                            .focus()
                            .toggleBlockquote()
                            .run()
                        }
                      >
                        <Quote className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Blockquote</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current
                            ?.chain()
                            .focus()
                            .toggleCodeBlock()
                            .run()
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
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current
                            ?.chain()
                            .focus()
                            .toggleSubscript()
                            .run()
                        }
                      >
                        <Subscript className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Subscript</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          editorRef.current
                            ?.chain()
                            .focus()
                            .toggleSuperscript()
                            .run()
                        }
                      >
                        <Superscript className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Superscript</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const color = prompt("Enter text color (hex):");
                          if (color) {
                            editorRef.current
                              ?.chain()
                              .focus()
                              .setColor(color)
                              .run();
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
                        onClick={() =>
                          editorRef.current
                            ?.chain()
                            .focus()
                            .toggleHighlight()
                            .run()
                        }
                      >
                        <Highlighter className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Highlight</TooltipContent>
                  </Tooltip>

                  <Separator orientation="vertical" className="h-6 mx-2" />

                  {/* Media and Links */}
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url = prompt("Enter image URL:");
                          if (url) {
                            editorRef.current
                              ?.chain()
                              .focus()
                              .setImage({ src: url })
                              .run();
                          }
                        }}
                      >
                        <Image className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Insert Image</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          const url = prompt("Enter URL:");
                          if (url) {
                            editorRef.current
                              ?.chain()
                              .focus()
                              .setLink({ href: url })
                              .run();
                          }
                        }}
                      >
                        <Link className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Insert Link</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          editorRef.current
                            ?.chain()
                            .focus()
                            .insertTable({
                              rows: 3,
                              cols: 3,
                              withHeaderRow: true,
                            })
                            .run();
                        }}
                      >
                        <Table className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Insert Table</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            </div>

            {/* Editor Content */}
            <div className="flex-1 bg-white">
              <TiptapEditor
                ref={editorRef}
                initialContent={documentContent}
                onUpdate={setDocumentContent}
                className="h-full"
              />
            </div>
          </div>

          {/* Comments Sidebar */}
          {showComments && (
            <div className="w-80 bg-white border-l border-gray-200 flex flex-col">
              <div className="p-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold">Comments</h3>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowComments(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {comments.map((comment) => (
                    <Card key={comment.id}>
                      <CardContent className="p-3">
                        <div className="flex items-start space-x-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">
                              {comment.author[0]}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center space-x-2">
                              <span className="text-sm font-medium">
                                {comment.author}
                              </span>
                              <span className="text-xs text-gray-500">
                                {comment.timestamp}
                              </span>
                            </div>
                            <p className="text-sm mt-1">{comment.content}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
              <div className="p-4 border-t border-gray-200">
                <div className="flex space-x-2">
                  <Textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 min-h-[60px]"
                  />
                  <Button size="sm" onClick={handleAddComment}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Generation Modal */}
      <AIGenerationModal
        isOpen={showAIModal}
        onClose={() => setShowAIModal(false)}
        onGenerate={handleAIGenerate}
        generationType={generationType}
      />
    </div>
  );
}
