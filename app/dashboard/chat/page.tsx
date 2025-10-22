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
import { FilesDocumentsDialog } from "@/components/file-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { FileUpload } from "@/components/ui/file-upload";
import { useSession } from "next-auth/react";
import { useSearchParams, useRouter } from "next/navigation";
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
  Settings,
  FileDown,
  Coins, // Add Coins icon for credits
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
    url?: string; // Add url property for data URLs
    error?: string; // Add error property for failed downloads
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
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Template mode state
  const [isTemplateMode, setIsTemplateMode] = useState(false);
  const [templateData, setTemplateData] = useState<any>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<Document[]>([]);
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [useSemanticSearch, setUseSemanticSearch] = useState(true);
  const [aiFormattingEnabled, setAiFormattingEnabled] = useState(true);
  const [selectedDocumentUrls, setSelectedDocumentUrls] = useState<string[]>(
    []
  );

  // Session state
  const [chatSessions, setChatSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>("current");
  const [currentSession, setCurrentSession] = useState<ChatSession | null>(
    null
  );

  // Documents state
  const [documents, setDocuments] = useState<Document[]>([]);
  const [availableDocuments] = useState<Document[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<any[]>([]);

  // Credit balance state
  const [creditBalance, setCreditBalance] = useState<number>(0);
  const [isLoadingCredits, setIsLoadingCredits] = useState(false);

  // Session management
  const sessions = chatSessions;

  // Get sessionId from URL parameters
  const sessionId = searchParams.get("sessionId");

  // Function to update URL with sessionId
  const updateUrlWithSessionId = (newSessionId: string) => {
    const url = new URL(window.location.href);
    url.searchParams.set("sessionId", newSessionId);
    router.replace(url.pathname + url.search);
  };

  // Load chat sessions on component mount
  useEffect(() => {
    const loadChatSessions = async () => {
      try {
        const response = await fetch("/api/chat-sessions");
        if (response.ok) {
          const data = await response.json();
          const sessions = data.chatSessions.map((session: any) => ({
            id: session.id,
            title: session.title,
            lastMessage:
              session.messages[session.messages.length - 1]?.content || "",
            timestamp: new Date(session.updatedAt),
            messageCount: session.messages.length,
          }));
          setChatSessions(sessions);

          // Handle sessionId from URL
          if (sessionId) {
            const foundSession = sessions.find(
              (s: ChatSession) => s.id === sessionId
            );
            if (foundSession) {
              setCurrentSession(foundSession);
              setSelectedSession(foundSession.id);
            } else {
              // Session not found, create new one or redirect
              await createNewSession();
            }
          } else {
            // No sessionId in URL
            if (sessions.length > 0) {
              const firstSession = sessions[0];
              setCurrentSession(firstSession);
              setSelectedSession(firstSession.id);
              updateUrlWithSessionId(firstSession.id);
            } else {
              // Create new session if none exist
              await createNewSession();
            }
          }
        }
      } catch (error) {
        console.error("Error loading chat sessions:", error);
        // Create new session on error
        if (!currentSession) {
          await createNewSession();
        }
      }
    };

    loadChatSessions();
  }, [sessionId]);

  // Load messages for current session
  useEffect(() => {
    const loadSessionMessages = async () => {
      if (currentSession && currentSession.id !== "current") {
        try {
          const response = await fetch(
            `/api/chat-messages?sessionId=${currentSession.id}`
          );
          if (response.ok) {
            const data = await response.json();
            setMessages(
              data.messages.map((msg: any) => ({
                id: msg.id,
                content: msg.content,
                role: msg.role,
                timestamp: new Date(msg.createdAt),
                referencedDocuments: msg.referencedDocs || [],
                documentFile: msg.documentFile,
              }))
            );
          }
        } catch (error) {
          console.error("Error loading session messages:", error);
        }
      }
    };

    loadSessionMessages();
  }, [currentSession]);

  const createNewSession = async () => {
    try {
      const response = await fetch("/api/chat-sessions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: "New Chat",
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const newSession: ChatSession = {
          id: data.chatSession.id,
          title: data.chatSession.title,
          lastMessage: "",
          timestamp: new Date(data.chatSession.createdAt),
          messageCount: 0,
        };

        setChatSessions((prev) => [newSession, ...prev]);
        setCurrentSession(newSession);
        setSelectedSession(newSession.id);
        setMessages([]);
        updateUrlWithSessionId(newSession.id);
      }
    } catch (error) {
      console.error("Error creating new session:", error);
      // Fallback to local session
      const newSession: ChatSession = {
        id: `session-${Date.now()}`,
        title: "New Chat",
        lastMessage: "",
        timestamp: new Date(),
        messageCount: 0,
      };
      setChatSessions((prev) => [newSession, ...prev]);
      setCurrentSession(newSession);
      setSelectedSession(newSession.id);
      setMessages([]);
      updateUrlWithSessionId(newSession.id);
    }
  };

  // Function to switch to a different session
  const switchToSession = (session: ChatSession) => {
    setCurrentSession(session);
    setSelectedSession(session.id);
    updateUrlWithSessionId(session.id);
  };

  const toggleDocumentSelection = (doc: Document) => {
    setSelectedDocuments((prev) =>
      prev.some((d) => d.id === doc.id)
        ? prev.filter((d) => d.id !== doc.id)
        : [...prev, doc]
    );
  };

  const handleSingleFileUpload = (file: File, result: any) => {
    setUploadedFiles((prev: any[]) => [...prev, file]);
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
    const initializeTemplateMode = async () => {
      const mode = searchParams.get("mode");
      const data = searchParams.get("data");
      const templateId = searchParams.get("template");

      // Handle new template context from sessionId parameter
      if (templateId && sessionId) {
        try {
          // Load the session that was created by the template API
          const response = await fetch(`/api/chat-sessions/${sessionId}`);
          if (response.ok) {
            const sessionData = await response.json();
            const session = {
              id: sessionData.chatSession.id,
              title: sessionData.chatSession.title,
              lastMessage:
                sessionData.chatSession.messages[
                  sessionData.chatSession.messages.length - 1
                ]?.content || "",
              timestamp: new Date(sessionData.chatSession.updatedAt),
              messageCount: sessionData.chatSession.messages.length,
            };

            setCurrentSession(session);
            setSelectedSession(session.id);
            setIsTemplateMode(true);

            // Load messages for this session
            const messages = sessionData.chatSession.messages.map(
              (msg: any) => ({
                id: msg.id,
                content: msg.content,
                role: msg.role,
                timestamp: new Date(msg.createdAt),
                referencedDocuments: msg.referencedDocs || [],
              })
            );
            setMessages(messages);

            // Update chat sessions list
            setChatSessions((prev) => {
              const exists = prev.find((s) => s.id === session.id);
              if (!exists) {
                return [session, ...prev];
              }
              return prev.map((s) => (s.id === session.id ? session : s));
            });
          }
        } catch (error) {
          console.error("Error loading template session:", error);
        }
        return;
      }

      // Handle legacy template mode
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
    };

    initializeTemplateMode();
  }, [searchParams, sessionId]);

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

  // Add function to fetch credit balance
  const fetchCreditBalance = useCallback(async () => {
    if (!session?.user?.email) return;

    try {
      setIsLoadingCredits(true);
      const response = await fetch("/api/credits");
      if (response.ok) {
        const data = await response.json();
        setCreditBalance(data.balance || 0);
      }
    } catch (error) {
      console.error("Failed to fetch credit balance:", error);
    } finally {
      setIsLoadingCredits(false);
    }
  }, [session?.user?.email]);

  // Fetch credit balance on component mount and session change
  useEffect(() => {
    fetchCreditBalance();
  }, [fetchCreditBalance]);

  // Send message function with credit consumption
  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    setSelectedDocuments([]);

    // Check if user has enough credits
    if (creditBalance <= 0) {
      const errorMessage: Message = {
        id: `credit-error-${Date.now()}`,
        content:
          "❌ Insufficient credits. Please top up your credits in the billing dashboard to continue chatting.",
        role: "assistant",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
      return;
    }

    const userMessage: Message = {
      id: `user-${Date.now()}`,
      content: input,
      role: "user",
      timestamp: new Date(),
      referencedDocuments: selectedDocuments.map((doc) => doc.name),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
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
      // Prepare context from selected documents
      const context =
        selectedDocuments.length > 0
          ? `Referenced documents: ${selectedDocuments
              .map((doc) => doc.name)
              .join(", ")}`
          : undefined;

      // Make API call to the main chat endpoint (which handles credit consumption internally)
      const messageResponse = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage.content,
          context: context,
          documentRequest: false,
          sessionId: currentSession?.id, // Pass the current session ID
          documentUrls: selectedDocumentUrls,
        }),
      });

      if (!messageResponse.ok) {
        throw new Error("Failed to send message to AI");
      }

      const aiResponse = await messageResponse.json();

      // Update credit balance from the response
      if (aiResponse.creditBalance !== undefined) {
        setCreditBalance(aiResponse.creditBalance);
      }

      const assistantMessage: Message = {
        id: `assistant-${Date.now()}`,
        content: aiResponse.response,
        role: "assistant",
        timestamp: new Date(),
        documentFile: aiResponse.documentFile,
      };

      setMessages((prev) =>
        prev.filter((msg) => msg.id !== "typing").concat(assistantMessage)
      );
      setIsLoading(false);
    } catch (error) {
      console.error("Error sending message:", error);

      // Remove typing indicator and show error
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        content: "❌ Failed to send message. Please try again.",
        role: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) =>
        prev.filter((msg) => msg.id !== "typing").concat(errorMessage)
      );
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
      setUploadedFiles((prev: any[]) => [...prev, ...successfulUploads]);

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

  // Generate document function with enhanced AI features
  const generateDocument = async (
    content: string,
    format: "pdf" | "excel" | "html",
    title?: string,
    useAIFormatting: boolean = true
  ) => {
    try {
      const enhancedOptions = {
        content,
        format,
        title: title || "Generated Document",
        template: "report",
        useAIFormatting,
        fontSize: 12,
        fontFamily: "helvetica",
        margins: { top: 20, right: 20, bottom: 20, left: 20 },
        pageSize: "a4" as const,
        orientation: "portrait" as const,
        includeHeader: true,
        includeFooter: true,
        headerText: title || "Generated Document",
        footerText: "Generated by AI Document Assistant",
      };

      const response = await fetch("/api/generate-document", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(enhancedOptions),
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
        content: `✅ ${
          useAIFormatting ? "AI-Enhanced" : "Standard"
        } document generated successfully as ${format.toUpperCase()} and downloaded.`,
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
          content: `📊 Document Analysis Complete:\n\n**Summary:** ${
            data.analysis.summary
          }\n\n**Key Points:**\n${
            data.analysis.keyPoints
              ?.map((point: string) => `• ${point}`)
              .join("\n") || "No key points found"
          }\n\n**Sentiment:** ${data.analysis.sentiment}\n**Topics:** ${
            data.analysis.topics?.join(", ") || "None identified"
          }`,
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, analysisMessage]);

        // Store extracted text for future queries
        if (data.extractedText) {
          console.log(
            "Document text extracted:",
            data.extractedText.substring(0, 200) + "..."
          );
        }
      } else {
        throw new Error(data.error || "Analysis failed");
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
                  <h1 className="font-semibold">
                    {isTemplateMode ? "Template Generator" : "AI Assistant"}
                  </h1>
                  <p className="text-sm text-muted-foreground">
                    {isTemplateMode
                      ? `Generating document from template`
                      : session?.user?.name
                      ? `Chatting with ${session.user.name}`
                      : "Ready to help"}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {/* Credit Balance Display */}
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge
                      variant="outline"
                      className="px-3 py-1 cursor-pointer"
                    >
                      <Coins className="h-3 w-3 mr-1" />
                      {isLoadingCredits
                        ? "..."
                        : creditBalance.toLocaleString()}{" "}
                      credits
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Your current credit balance</p>
                    <p className="text-xs text-muted-foreground">
                      1 credit per message
                    </p>
                  </TooltipContent>
                </Tooltip>

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
                            {(() => {
                              const containsHtml =
                                typeof message.content === "string" &&
                                /<\/?[a-z][\s\S]*>/i.test(message.content);
                              if (message.role === "assistant" && containsHtml) {
                                return "📄 Dokumen telah dibuat. Gunakan tombol download di bawah untuk mengunduh.";
                              }
                              return message.content;
                            })()}
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
                                        onClick={() => {
                                          if (message.documentFile?.error) {
                                            // Show error message if PDF processing failed
                                            alert(
                                              `Download failed: ${message.documentFile.error}`
                                            );
                                            return;
                                          }

                                          if (
                                            message.documentFile?.url &&
                                            message.documentFile.url !== "#" &&
                                            !message.documentFile.url.startsWith(
                                              "data:"
                                            )
                                          ) {
                                            // For real URLs, open in new tab
                                            window.open(
                                              message.documentFile.url,
                                              "_blank"
                                            );
                                          } else if (
                                            message.documentFile?.url &&
                                            message.documentFile.url.startsWith(
                                              "data:"
                                            )
                                          ) {
                                            try {
                                              // For data URLs, create download link with better error handling
                                              const a =
                                                document.createElement("a");
                                              a.href = message.documentFile.url;
                                              a.download =
                                                message.documentFile.name ||
                                                "document.pdf";
                                              a.style.display = "none";
                                              document.body.appendChild(a);
                                              a.click();
                                              document.body.removeChild(a);
                                            } catch (error) {
                                              console.error(
                                                "Download failed:",
                                                error
                                              );
                                              alert(
                                                "Download failed. The file may be too large or corrupted."
                                              );
                                            }
                                          } else {
                                            // For mock documents, create a downloadable blob
                                            const content = `Mock Document: ${
                                              message.documentFile?.name
                                            }\nType: ${
                                              message.documentFile?.type
                                            }\nGenerated at: ${new Date().toISOString()}`;
                                            const blob = new Blob([content], {
                                              type: "text/plain",
                                            });
                                            const url =
                                              URL.createObjectURL(blob);
                                            const a =
                                              document.createElement("a");
                                            a.href = url;
                                            a.download =
                                              message.documentFile?.name ||
                                              "document.txt";
                                            document.body.appendChild(a);
                                            a.click();
                                            document.body.removeChild(a);
                                            URL.revokeObjectURL(url);
                                          }
                                        }}
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <FileDown className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>
                                Generate Document
                              </DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  generateDocument(
                                    message.content,
                                    "pdf",
                                    "Chat Response",
                                    aiFormattingEnabled
                                  )
                                }
                              >
                                <Sparkles className="mr-2 h-4 w-4" />
                                AI-Enhanced PDF
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  generateDocument(
                                    message.content,
                                    "pdf",
                                    "Chat Response",
                                    false
                                  )
                                }
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Standard PDF
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  generateDocument(
                                    message.content,
                                    "html",
                                    "Chat Response"
                                  )
                                }
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                HTML Document
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  generateDocument(
                                    message.content,
                                    "excel",
                                    "Chat Response"
                                  )
                                }
                              >
                                <FileText className="mr-2 h-4 w-4" />
                                Excel Spreadsheet
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
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
                  <FilesDocumentsDialog
                    documents={documents}
                    selectedDocuments={selectedDocuments as any}
                    onSubmit={(urls, docs) => {
                      setSelectedDocumentUrls(urls);
                      // Mirror selection for UI badges (name display)
                      try {
                        const mapped = docs.map((d: any) => ({
                          id: d.id,
                          name: d.name,
                          type:
                            typeof d.fileType === "string"
                              ? d.fileType
                              : d.type || "document",
                          uploadDate: new Date(
                            d.updatedAt || d.createdAt || Date.now()
                          ),
                        }));
                        setSelectedDocuments(mapped);
                      } catch (e) {
                        console.warn(
                          "Failed to map selected docs for UI display:",
                          e
                        );
                      }
                    }}
                  />
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
                  onClick={() => {
                    switchToSession(chatSession);
                  }}
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
