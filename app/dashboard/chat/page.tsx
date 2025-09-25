"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileUpload } from "@/components/ui/file-upload";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import {
  Send,
  Bot,
  User,
  FileText,
  Sparkles,
  Mic,
  Paperclip,
  MoreHorizontal,
  Copy,
  RefreshCw,
  ThumbsUp,
  ThumbsDown,
  Plus,
  MessageSquare,
  Clock,
  Search,
  X,
  AtSign,
  File,
  Download,
  Eye,
  Brain,
} from "lucide-react";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isTyping?: boolean;
  referencedDocuments?: string[];
  documentFile?: {
    name: string;
    type: string;
    downloadUrl: string;
  };
}

interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

interface Document {
  id: string;
  name: string;
  type: string;
  uploadDate: Date;
}

export default function ChatPage() {
  const searchParams = useSearchParams();
  const [isTemplateMode, setIsTemplateMode] = useState(false);
  const [templateData, setTemplateData] = useState<any>(null);

  const [messages, setMessages] = useState<Message[]>([]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string>("current");
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);
  const { data: session } = useSession();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Chat sessions - empty by default
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(
    null
  );

  // Uploaded documents - empty by default
  const [documents] = useState<Document[]>([]);
  const [availableDocuments] = useState<Document[]>([]);

  // Session management
  const sessions = chatSessions;

  // Load chat sessions on component mount
  useEffect(() => {
    const loadChatSessions = async () => {
      try {
        const response = await fetch('/api/chat-sessions');
        if (response.ok) {
          const data = await response.json();
          setChatSessions(data.chatSessions.map((session: any) => ({
            id: session.id,
            title: session.title,
            lastMessage: session.messages[session.messages.length - 1]?.content || '',
            timestamp: new Date(session.updatedAt),
            messageCount: session.messages.length,
          })));
        }
      } catch (error) {
        console.error('Error loading chat sessions:', error);
      }
    };

    loadChatSessions();
  }, []);

  // Load messages for current session
  useEffect(() => {
    const loadSessionMessages = async () => {
      if (currentSession && currentSession.id !== 'current') {
        try {
          const response = await fetch(`/api/chat-messages?sessionId=${currentSession.id}`);
          if (response.ok) {
            const data = await response.json();
            setMessages(data.messages.map((msg: any) => ({
              id: msg.id,
              content: msg.content,
              role: msg.role,
              timestamp: new Date(msg.createdAt),
              referencedDocuments: msg.referencedDocs || [],
            })));
          }
        } catch (error) {
          console.error('Error loading session messages:', error);
        }
      }
    };

    loadSessionMessages();
  }, [currentSession]);

  const createNewSession = async () => {
    try {
      const response = await fetch('/api/chat-sessions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: 'New Chat',
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newSession: ChatSession = {
          id: data.chatSession.id,
          title: data.chatSession.title,
          lastMessage: '',
          timestamp: new Date(data.chatSession.createdAt),
          messageCount: 0,
        };
        
        setChatSessions(prev => [newSession, ...prev]);
        setCurrentSession(newSession);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error creating new session:', error);
      // Fallback to local session
      const newSession: ChatSession = {
        id: `session-${Date.now()}`,
        title: 'New Chat',
        lastMessage: '',
        timestamp: new Date(),
        messageCount: 0,
      };
      setChatSessions(prev => [newSession, ...prev]);
      setCurrentSession(newSession);
      setMessages([]);
    }
  };

  const toggleDocumentSelection = (doc: Document) => {
    setSelectedDocuments((prev) =>
      prev.some((d) => d.id === doc.id)
        ? prev.filter((d) => d.id !== doc.id)
        : [...prev, doc]
    );
  };

  const handleSingleFileUpload = (file: File, result: any) => {
    setUploadedFiles((prev) => [...prev, file]);
    setShowFileUpload(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollContainer) {
        scrollContainer.scrollTop = scrollContainer.scrollHeight;
      }
    }
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle template mode initialization
  useEffect(() => {
    const mode = searchParams.get("mode");
    const data = searchParams.get("data");

    if (mode === "template" && data) {
      try {
        const parsedData = JSON.parse(data);
        setIsTemplateMode(true);
        setTemplateData(parsedData);

        // Create initial template message
        const templateMessage: Message = {
          id: "template-init",
          content: `Saya akan membantu Anda membuat ${
            parsedData.templateName
          }. Berdasarkan informasi yang Anda berikan:\n\n${Object.entries(
            parsedData.formData
          )
            .map(([key, value]) => `• ${key.replace("_", " ")}: ${value}`)
            .join(
              "\n"
            )}\n\nSaya akan memproses dan membuat dokumen untuk Anda...`,
          role: "assistant",
          timestamp: new Date(),
        };

        setMessages((prev) => [...prev, templateMessage]);

        // Auto-generate document after a delay
        setTimeout(() => {
          generateTemplateDocument(parsedData);
        }, 2000);
      } catch (error) {
        console.error("Error parsing template data:", error);
      }
    }
  }, [searchParams]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = "auto";
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + "px";
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const generateTemplateDocument = (templateData: any) => {
    // Add typing indicator
    const typingMessage: Message = {
      id: "generating",
      content: "",
      role: "assistant",
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages((prev) => [...prev, typingMessage]);

    // Simulate document generation
    setTimeout(() => {
      const documentMessage: Message = {
        id: `doc-${Date.now()}`,
        content: `Dokumen ${templateData.templateName} telah berhasil dibuat! Berikut adalah dokumen yang telah saya generate berdasarkan informasi yang Anda berikan.`,
        role: "assistant",
        timestamp: new Date(),
        documentFile: {
          name: `${templateData.templateName}_${
            new Date().toISOString().split("T")[0]
          }.pdf`,
          type: "PDF",
          downloadUrl: "#", // This would be a real URL in production
        },
      };

      setMessages((prev) =>
        prev.filter((msg) => msg.id !== "generating").concat(documentMessage)
      );
    }, 3000);
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: "user",
      timestamp: new Date(),
      referencedDocuments:
        selectedDocuments.length > 0
          ? selectedDocuments.map((doc) => doc.id)
          : undefined,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setSelectedDocuments([]);
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: "typing",
      content: "",
      role: "assistant",
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages((prev) => [...prev, typingMessage]);

    try {
      // Ensure we have a current session
      let sessionId = currentSession?.id;
      if (!sessionId || sessionId === 'current') {
        await createNewSession();
        sessionId = currentSession?.id || `session-${Date.now()}`;
      }

      // Save user message to database
      if (sessionId && sessionId !== 'current') {
        try {
          await fetch('/api/chat-messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
             sessionId,
             content: input,
             role: 'user',
             referencedDocs: selectedDocuments.map((doc) => doc.id),
           }),
          });
        } catch (error) {
          console.error('Error saving user message:', error);
        }
      }

      // Call the chat API with semantic search if enabled
      const apiEndpoint = useSemanticSearch
        ? "/api/chat-with-context"
        : "/api/chat";
      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: input,
          sessionId,
          useSemanticSearch: useSemanticSearch,
          documentIds:
            selectedDocuments.length > 0 ? selectedDocuments.map((doc) => doc.id) : undefined,
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      // Check if response has error field, otherwise assume success
      if (data.error) {
        throw new Error(data.error);
      }

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        content: data.response,
        role: "assistant",
        timestamp: new Date(),
        referencedDocuments: data.referencedDocuments || [],
        documentFile: data.documentFile
          ? {
              name: data.documentFile.name,
              type: data.documentFile.type,
              downloadUrl: data.documentFile.url || "#",
            }
          : undefined,
      };

      setMessages((prev) =>
        prev.filter((msg) => msg.id !== "typing").concat(assistantMessage)
      );

      // Save assistant message to database
      if (sessionId && sessionId !== 'current') {
        try {
          await fetch('/api/chat-messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              sessionId,
              content: data.response,
              role: 'assistant',
              referencedDocs: data.referencedDocuments || [],
            }),
          });

          // Update session in local state
          setChatSessions(prev => prev.map(session => 
            session.id === sessionId 
              ? { ...session, lastMessage: data.response, timestamp: new Date(), messageCount: session.messageCount + 2 }
              : session
          ));
        } catch (error) {
          console.error('Error saving assistant message:', error);
        }
      }

    } catch (error) {
      console.error("Chat error:", error);

      // Show error message to user
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        content:
          error instanceof Error && error.message.includes("rate limit")
            ? "Maaf, terlalu banyak permintaan. Silakan coba lagi dalam beberapa saat."
            : "Maaf, terjadi kesalahan saat memproses pesan Anda. Silakan coba lagi.",
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) =>
        prev.filter((msg) => msg.id !== "typing").concat(errorMessage)
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  // File upload handlers
  const handleFileUpload = async (uploadResults: any[]) => {
    // uploadResults is already the array of successful upload results from the FileUpload component
    const successfulUploads = uploadResults.filter(
      (result) => result && result.url
    );

    if (successfulUploads.length > 0) {
      setUploadedFiles((prev) => [...prev, ...successfulUploads]);

      // Process each uploaded file
      for (const result of successfulUploads) {
        if (result.fileType?.startsWith("image/")) {
          // Use Groq OCR for image files
          await performOCR(result.url, result.fileName);
        } else if (isDocumentFile(result.fileType, result.fileName)) {
          // Parse document files (PDF, DOCX, XLSX, PPTX)
          await parseDocumentFile(
            result.file,
            result.fileName,
            result.fileType
          );
        }
      }
    }

    // Show upload results
    const successCount = successfulUploads.length;

    let message = "";
    if (successCount > 0) {
      message = `✅ ${successCount} file(s) uploaded successfully.`;
    }

    // Add system message about upload results
    const uploadMessage: Message = {
      id: `upload-${Date.now()}`,
      content: message,
      role: "assistant",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, uploadMessage]);
  };

  // Check if file is a document that can be parsed
  const isDocumentFile = (fileType: string, fileName: string): boolean => {
    const documentTypes = [
      "application/pdf",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "application/vnd.ms-excel",
      "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    ];

    const extension = fileName.split(".").pop()?.toLowerCase();
    const documentExtensions = ["pdf", "docx", "xlsx", "xls", "pptx"];

    return (
      documentTypes.includes(fileType) ||
      documentExtensions.includes(extension || "")
    );
  };

  // Parse document files using the document parser
  const parseDocumentFile = async (
    file: File,
    fileName: string,
    fileType: string
  ) => {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/parse-document", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Document parsing failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.extractedText) {
        const parseMessage: Message = {
          id: `parse-${Date.now()}`,
          content: `📄 **Document Content for ${fileName}:**\n\n${result.extractedText.substring(
            0,
            1000
          )}${
            result.extractedText.length > 1000
              ? "...\n\n*[Content truncated for display. Full content available for AI analysis.]*"
              : ""
          }`,
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, parseMessage]);
      }
    } catch (error) {
      console.error("Document parsing error:", error);
      const errorMessage: Message = {
        id: `parse-error-${Date.now()}`,
        content: `❌ Failed to parse document ${fileName}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const performOCR = async (imageUrl: string, fileName: string) => {
    try {
      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageUrl }),
      });

      if (!response.ok) {
        throw new Error(`OCR failed: ${response.statusText}`);
      }

      const result = await response.json();

      if (result.success && result.extractedText) {
        const ocrMessage: Message = {
          id: `ocr-${Date.now()}`,
          content: `📄 **OCR Results for ${fileName}:**\n\n${result.extractedText}`,
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, ocrMessage]);
      }
    } catch (error) {
      console.error("OCR error:", error);
      const errorMessage: Message = {
        id: `ocr-error-${Date.now()}`,
        content: `❌ Failed to perform OCR on ${fileName}: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const handleAtSymbol = () => {
    setShowDocumentPicker(true);
  };

  const newChat = () => {
    createNewSession();
  };

  // Generate document function
  const generateDocument = async (
    content: string,
    format: "pdf" | "excel" | "html",
    title?: string
  ) => {
    try {
      const response = await fetch("/api/generate-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          format,
          title: title || "Generated Document",
          template: "report",
        }),
      });

      if (!response.ok) {
        throw new Error(`Document generation failed: ${response.statusText}`);
      }

      // Create download link
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      a.download = `${title || "document"}.${
        format === "excel" ? "xlsx" : format
      }`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      const successMessage: Message = {
        id: `generate-success-${Date.now()}`,
        content: `✅ Document generated successfully as ${format.toUpperCase()} and downloaded.`,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, successMessage]);
    } catch (error) {
      console.error("Document generation error:", error);
      const errorMessage: Message = {
        id: `generate-error-${Date.now()}`,
        content: `❌ Failed to generate document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    }
  };

  // Analyze document function
  const analyzeDocument = async (documentId: string) => {
    try {
      setIsLoading(true);
      const response = await fetch(`/api/documents/${documentId}/analyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(`Document analysis failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.success) {
        const analysisMessage: Message = {
          id: `analysis-${Date.now()}`,
          content: `📊 Document Analysis Complete:\n\n**Summary:** ${data.analysis.summary}\n\n**Key Points:**\n${data.analysis.keyPoints?.map((point: string) => `• ${point}`).join("\n") || "No key points found"}\n\n**Sentiment:** ${data.analysis.sentiment}\n**Topics:** ${data.analysis.topics?.join(", ") || "None identified"}`,
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, analysisMessage]);
        
        // Store extracted text for future queries
        if (data.extractedText) {
          console.log('Document text extracted:', data.extractedText.substring(0, 200) + '...');
        }
      } else {
        throw new Error(data.error || 'Analysis failed');
      }
    } catch (error) {
      console.error("Document analysis error:", error);
      const errorMessage: Message = {
        id: `analysis-error-${Date.now()}`,
        content: `❌ Failed to analyze document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Upload document function with documents list update
  const uploadDocument = async (file: File) => {
    try {
      setIsLoading(true);
      const formData = new FormData();
      formData.append("file", file);

      // First, upload to S3
      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        const errorData = await uploadResponse.json();
        throw new Error(errorData.error || "Upload failed");
      }

      const uploadResult = await uploadResponse.json();

      // Then, save document metadata to database
      const documentData = {
        name: file.name,
        type: file.type,
        size: file.size,
        content: "", // We'll store the S3 URL instead
        url: uploadResult.file.url,
        key: uploadResult.file.key,
        bucket: uploadResult.file.bucket,
        folderId: null, // Chat uploads go to root folder
      };

      const documentResponse = await fetch("/api/documents", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(documentData),
      });

      if (!documentResponse.ok) {
        throw new Error("Failed to save document to database");
      }

      const newDocument = await documentResponse.json();

      // Add success message
      const successMessage: Message = {
        id: `upload-success-${Date.now()}`,
        content: `📄 Document "${file.name}" uploaded successfully and is now available in your documents.`,
        role: "assistant",
        timestamp: new Date(),
        documentFile: {
          name: file.name,
          type: file.type,
          downloadUrl: uploadResult.file.url || "#",
        },
      };
      setMessages((prev) => [...prev, successMessage]);

      // Refresh documents list (this would typically trigger a re-fetch)
      window.dispatchEvent(new CustomEvent("documentsUpdated"));
    } catch (error) {
      console.error("Upload error:", error);
      const errorMessage: Message = {
        id: `upload-error-${Date.now()}`,
        content: `❌ Failed to upload document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-20 flex items-center w-full">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Bot className="h-8 w-8" />
                {/* <Avatar className="h-8 w-8">
                  <AvatarImage src="/logo/logo.svg" alt="DocuMind" />
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar> */}
                <div>
                  <h1 className="font-semibold">AI Assistant</h1>
                  <p className="text-sm text-muted-foreground">
                    {session?.user?.name
                      ? `Chatting with ${session.user.name}`
                      : "Ready to help"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="px-3 py-1">
                  <div className="h-2 w-2 bg-green-500 rounded-full mr-2"></div>
                  Online
                </Badge>
                <Button variant="ghost" size="sm">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Messages */}
          <ScrollArea className="flex-1 p-4" ref={scrollAreaRef}>
            <div className="mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`group flex items-start space-x-3 ${
                    message.role === "user"
                      ? "flex-row-reverse space-x-reverse"
                      : ""
                  }`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback
                      className={
                        message.role === "assistant"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }
                    >
                      {message.role === "assistant" ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex-1 space-y-2 ${
                      message.role === "user" ? "flex flex-col items-end" : ""
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }`}
                    >
                      {message.isTyping ? (
                        <div className="flex items-center space-x-2 py-2">
                          <div className="flex space-x-1">
                            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div
                              className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            AI is thinking...
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">
                            {message.content}
                          </div>

                          {/* Document File Display */}
                          {message.documentFile && (
                            <div className="mt-3 p-3 bg-background border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <FileText className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">
                                      {message.documentFile.name}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                      {message.documentFile.type} Document
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                      >
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Preview Document
                                    </TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-8 w-8 p-0"
                                      >
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      Download Document
                                    </TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </div>
                          )}

                          {message.referencedDocuments &&
                            message.referencedDocuments.length > 0 && (
                              <div className="mt-2 flex flex-wrap gap-1">
                                {message.referencedDocuments.map((docId) => {
                                  const doc = documents.find(
                                    (d) => d.id === docId
                                  );
                                  return doc ? (
                                    <Badge
                                      key={docId}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      <File className="h-3 w-3 mr-1" />
                                      {doc.name}
                                    </Badge>
                                  ) : null;
                                })}
                              </div>
                            )}
                        </>
                      )}
                    </div>

                    <div
                      className={`flex items-center space-x-2 text-xs text-muted-foreground ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <span>{formatTime(message.timestamp)}</span>
                      {message.role === "assistant" && !message.isTyping && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyMessage(message.content)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy message</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Regenerate</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Good response</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Poor response</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() =>
                                  generateDocument(
                                    message.content,
                                    "pdf",
                                    "Chat Response"
                                  )
                                }
                              >
                                <Download className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Generate PDF</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="mx-auto">
              {/* Referenced Documents */}
              {selectedDocuments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedDocuments.map((doc) => (
                    <Badge
                      key={doc.id}
                      variant="secondary"
                      className="px-2 py-1"
                    >
                      <File className="h-3 w-3 mr-1" />
                      {doc.name}
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                        onClick={() => toggleDocumentSelection(doc)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  ))}
                </div>
              )}

              <div className="flex items-end space-x-2">
                <div className="flex space-x-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() =>
                          setShowDocumentPicker(!showDocumentPicker)
                        }
                        className={showDocumentPicker ? "bg-muted" : ""}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach documents</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFileUpload(!showFileUpload)}
                        className={showFileUpload ? "bg-muted" : ""}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Upload files</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleAtSymbol}
                      >
                        <AtSign className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reference documents</TooltipContent>
                  </Tooltip>

                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setUseSemanticSearch(!useSemanticSearch)}
                        className={
                          useSemanticSearch ? "bg-primary/10 text-primary" : ""
                        }
                      >
                        <Search className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      {useSemanticSearch
                        ? "Disable semantic search"
                        : "Enable semantic search"}
                    </TooltipContent>
                  </Tooltip>
                </div>

                <div className="flex-1 relative">
                  <Textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything about your documents..."
                    disabled={isLoading}
                    className="min-h-[44px] max-h-[120px] resize-none pr-12 border-input focus:border-primary"
                    rows={1}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute right-2 top-2"
                  >
                    <Mic className="h-4 w-4" />
                  </Button>
                </div>

                <Button
                  onClick={sendMessage}
                  disabled={!input.trim() || isLoading}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>

              {/* File Upload */}
              {showFileUpload && (
                <Card className="mt-3">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Upload Files
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowFileUpload(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <FileUpload
                      onFileUpload={(file, result) => {
                        // Handle individual file upload completion
                        console.log("File uploaded:", file.name, result);
                        uploadDocument(file);
                      }}
                      onAllUploadsComplete={(results) => {
                        // Handle all uploads completion
                        handleFileUpload(results);
                      }}
                      onError={(error) => {
                        console.error("Upload error:", error);
                      }}
                      maxSize={10 * 1024 * 1024} // 10MB
                      acceptedTypes={[
                        "image/jpeg",
                        "image/png",
                        "image/gif",
                        "image/webp",
                        "application/pdf",
                        "application/msword",
                        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                        "application/vnd.ms-excel",
                        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                        "text/plain",
                      ]}
                      multiple={true}
                    />
                  </CardContent>
                </Card>
              )}

              {/* Document Picker */}
              {showDocumentPicker && (
                <Card className="mt-3">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center justify-between">
                      Reference Documents
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDocumentPicker(false)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="space-y-2 max-h-40 overflow-y-auto">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          className={`flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors ${
                            selectedDocuments.some((d) => d.id === doc.id)
                              ? "bg-primary/10 border border-primary"
                              : "hover:bg-muted"
                          }`}
                          onClick={() => toggleDocumentSelection(doc)}
                        >
                          <File className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {doc.name}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {doc.type} • {formatDate(doc.uploadDate)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              <p className="text-xs text-muted-foreground mt-2 text-center">
                Press Enter to send • Shift+Enter for new line • Use @ to
                reference documents
              </p>
            </div>
          </div>
        </div>

        {/* Sidebar with Chat History */}
        <div className="w-96 border-l h-screen bg-muted/10 flex flex-col">
          <div className="p-4 border-b h-20 flex items-center w-full">
            <div className="flex items-center justify-between space-x-2 w-full">
              <h2 className="text-lg font-semibold flex-1">Chat History</h2>
              <Button size="sm" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
              <Button onClick={newChat} size="sm" variant="outline">
                <Plus className="h-4 w-4" />
                {/* New Chat */}
              </Button>
            </div>
            {/* <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search conversations..." className="pl-9" />
            </div> */}
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {chatSessions.map((chatSession) => (
                <Card
                  key={chatSession.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedSession === chatSession.id
                      ? "bg-muted border-primary"
                      : ""
                  }`}
                  onClick={() => setSelectedSession(chatSession.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">
                          {chatSession.title}
                        </h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {chatSession.lastMessage}
                        </p>
                        <div className="flex items-center mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(chatSession.timestamp)}
                          <Separator
                            orientation="vertical"
                            className="mx-2 h-3"
                          />
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {chatSession.messageCount}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </div>
      </div>
    </TooltipProvider>
  );
}
