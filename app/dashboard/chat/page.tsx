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
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/ui/code-block";
import { toast } from "sonner";
import ResourceFile from "@/components/resource-file";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isTyping?: boolean;
  referencedDocs?: { name: string; url: string }[];
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
  const [selectedreferencedDocs, setSelectedreferencedDocs] = useState<
    { name: string; url: string }[]
  >([]);

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
  const [isLoadingSessions, setIsLoadingSessions] = useState(true);
  const [isCreatingChat, setIsCreatingChat] = useState(false);

  const [isLoadingMessages, setIsLoadingMessages] = useState(false);

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
        setIsLoadingSessions(true);
        const response = await fetch("/api/chat");
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
      } finally {
        setIsLoadingSessions(false);
      }
    };

    loadChatSessions();
  }, [sessionId]);

  // Load messages for current session
  useEffect(() => {
    const loadSessionMessages = async () => {
      if (currentSession && currentSession.id !== "current") {
        try {
          setIsLoadingMessages(true);
          const response = await fetch(
            `/api/chat?sessionId=${currentSession.id}`
          );
          if (response.ok) {
            const data = await response.json();
            setMessages(
              (data.messages || []).map((msg: any) => ({
                id: msg.id,
                content: msg.content,
                role: msg.role,
                timestamp: new Date(msg.createdAt),
                referencedDocs: normalizeReferencedDocs(msg.referencedDocs),
              }))
            );
          }
        } catch (error) {
          console.error("Error loading session messages:", error);
        } finally {
          setIsLoadingMessages(false);
        }
      } else {
        setMessages([]);
        setIsLoadingMessages(false);
      }
    };

    loadSessionMessages();
  }, [currentSession]);

  const createNewSession = async () => {
    setIsCreatingChat(true);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          action: "createSession",
          title: "New Chat",
          type: "chat",
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
    } finally {
      setIsCreatingChat(false);
    }
  };

  // Function to switch to a different session
  const switchToSession = (session: ChatSession) => {
    setCurrentSession(session);
    setSelectedSession(session.id);
    updateUrlWithSessionId(session.id);
  };

  const deleteChatSession = async (id: string) => {
    try {
      const response = await fetch(`/api/chat-sessions/${id}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        let errMsg = "Gagal menghapus chat session";
        try {
          const data = await response.json();
          if (data?.error) errMsg = data.error;
        } catch {}
        throw new Error(errMsg);
      }

      // Update daftar sessions di UI
      setChatSessions((prev) => prev.filter((s) => s.id !== id));

      // Jika session yang dihapus adalah session aktif, pilih session lain atau buat baru
      if (currentSession?.id === id) {
        const remaining = chatSessions.filter((s) => s.id !== id);
        if (remaining.length > 0) {
          const next = remaining[0];
          setCurrentSession(next);
          setSelectedSession(next.id);
          updateUrlWithSessionId(next.id);
          // Muat ulang pesan untuk session baru
          try {
            setIsLoadingMessages(true);
            const res = await fetch(`/api/chat?sessionId=${next.id}`);
            if (res.ok) {
              const data = await res.json();
              setMessages(
                (data.messages || []).map((msg: any) => ({
                  id: msg.id,
                  content: msg.content,
                  role: msg.role,
                  timestamp: new Date(msg.createdAt),
                  referencedDocs: msg.referencedDocs || [],
                }))
              );
            } else {
              setMessages([]);
            }
          } catch {
            setMessages([]);
          } finally {
            setIsLoadingMessages(false);
          }
        } else {
          // Tidak ada session tersisa: buat session baru
          setCurrentSession(null);
          setSelectedSession("current");
          setMessages([]);
          await createNewSession();
        }
      }
    } catch (error) {
      console.error("Error deleting chat session:", error);
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
          const response = await fetch(`/api/chat?sessionId=${sessionId}`);
          if (response.ok) {
            const sessionData = await response.json();
            const session = {
              id: sessionData.chatSession.id,
              title: sessionData.chatSession.title,
              lastMessage:
                (sessionData.messages || [])[sessionData.messages.length - 1]
                  ?.content || "",
              timestamp: new Date(sessionData.chatSession.updatedAt),
              messageCount: (sessionData.messages || []).length,
            };

            setCurrentSession(session);
            setSelectedSession(session.id);
            setIsTemplateMode(true);

            // Load messages for this session
            const messages = (sessionData.messages || []).map((msg: any) => ({
              id: msg.id,
              content: msg.content,
              role: msg.role,
              timestamp: new Date(msg.createdAt),
              referencedDocs: msg.referencedDocs || [],
            }));
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
        prev.map((msg) => (msg.id === "generating" ? documentMessage : msg))
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

  // Normalize referenced docs payloads (handles legacy string[] and object[])
  const normalizeReferencedDocs = (
    value: any
  ): { name: string; url: string }[] => {
    if (!Array.isArray(value)) return [];
    return value
      .map((item: any) => {
        if (typeof item === "string") {
          return { name: item, url: item };
        }
        const name = item?.name ?? item?.url ?? "";
        const url = item?.url ?? item?.name ?? "";
        return { name, url };
      })
      .filter((d) => !!d.name && !!d.url);
  };

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
      referencedDocs: selectedreferencedDocs,
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
          referencedDocs: selectedreferencedDocs,
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
        id: aiResponse.messageId || `assistant-${Date.now()}`,
        content: aiResponse.response,
        role: "assistant",
        timestamp: new Date(),
        documentFile: aiResponse.documentFile,
        referencedDocs: normalizeReferencedDocs(aiResponse.referencedDocs),
      };

      setMessages((prev) =>
        prev.map((msg) => (msg.id === "typing" ? assistantMessage : msg))
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
        prev.map((msg) => (msg.id === "typing" ? errorMessage : msg))
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
  const copyMessage = (content: string) => {
    toast.success("Copied to clipboard");
    navigator.clipboard.writeText(content);
  };

  const [expand, setExpand] = useState<string[]>([]);

  console.log(expand);

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
              {(isLoadingMessages || isLoadingSessions) && (
                <div className="space-y-6">
                  {[...Array(6)].map((_, i) => (
                    <div key={`skeleton-msg-${i}`} className="space-y-6">
                      <div className="flex items-start space-x-3">
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                        <div className="h-20 w-2/3 bg-muted rounded-2xl animate-pulse" />
                      </div>
                      <div className="flex items-start justify-end space-x-3">
                        <div className="h-20 w-2/3 bg-muted rounded-2xl animate-pulse" />
                        <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {(!isLoadingMessages || !isLoadingSessions) &&
                messages.map((message) => (
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
                            <div className="text-sm leading-relaxed">
                              {(() => {
                                const containsHtml =
                                  typeof message.content === "string" &&
                                  /<\/?[a-z][\s\S]*>/i.test(message.content);
                                if (
                                  message.role === "assistant" &&
                                  containsHtml
                                ) {
                                  return "📄 Dokumen telah dibuat. Gunakan tombol download di bawah untuk mengunduh.";
                                }
                                if (message.role === "assistant") {
                                  return (
                                    <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:p-0 prose-code:text-sm">
                                      <ReactMarkdown
                                        remarkPlugins={[remarkGfm]}
                                        components={{
                                          code({
                                            node,
                                            inline,
                                            className,
                                            children,
                                            ...props
                                          }: any) {
                                            return (
                                              <CodeBlock
                                                className={className}
                                                inline={inline}
                                                {...props}
                                              >
                                                {String(children).replace(
                                                  /\n$/,
                                                  ""
                                                )}
                                              </CodeBlock>
                                            );
                                          },
                                          h1: ({ children }) => (
                                            <h1 className="text-xl font-bold mb-4 text-foreground">
                                              {children}
                                            </h1>
                                          ),
                                          h2: ({ children }) => (
                                            <h2 className="text-lg font-semibold mb-3 text-foreground">
                                              {children}
                                            </h2>
                                          ),
                                          h3: ({ children }) => (
                                            <h3 className="text-base font-medium mb-2 text-foreground">
                                              {children}
                                            </h3>
                                          ),
                                          p: ({ children }) => (
                                            <p className="mb-3 text-foreground leading-relaxed">
                                              {children}
                                            </p>
                                          ),
                                          ul: ({ children }) => (
                                            <ul className="list-disc list-inside mb-3 space-y-1 text-foreground">
                                              {children}
                                            </ul>
                                          ),
                                          ol: ({ children }) => (
                                            <ol className="list-decimal list-inside mb-3 space-y-1 text-foreground">
                                              {children}
                                            </ol>
                                          ),
                                          li: ({ children }) => (
                                            <li className="text-foreground">
                                              {children}
                                            </li>
                                          ),
                                          blockquote: ({ children }) => (
                                            <blockquote className="border-l-4 border-muted-foreground pl-4 italic mb-3 text-muted-foreground">
                                              {children}
                                            </blockquote>
                                          ),
                                          table: ({ children }) => (
                                            <div className="overflow-x-auto mb-3">
                                              <table className="min-w-full border-collapse border border-border">
                                                {children}
                                              </table>
                                            </div>
                                          ),
                                          th: ({ children }) => (
                                            <th className="border border-border px-3 py-2 bg-muted font-medium text-left">
                                              {children}
                                            </th>
                                          ),
                                          td: ({ children }) => (
                                            <td className="border border-border px-3 py-2">
                                              {children}
                                            </td>
                                          ),
                                          strong: ({ children }) => (
                                            <strong className="font-semibold text-foreground">
                                              {children}
                                            </strong>
                                          ),
                                          em: ({ children }) => (
                                            <em className="italic text-foreground">
                                              {children}
                                            </em>
                                          ),
                                        }}
                                      >
                                        {message.content}
                                      </ReactMarkdown>
                                    </div>
                                  );
                                }
                                return message.content;
                              })()}
                            </div>
                          </>
                        )}
                      </div>

                      {/* Document File Display */}
                      {message.documentFile && (
                        <ResourceFile resource={message.documentFile} />
                      )}

                      {message.referencedDocs && (
                        <>
                          {message.referencedDocs.length > 0 && (
                            <div
                              className={cn(
                                "mt-2 flex flex-wrap gap-1",
                                expand.includes(message.id)
                                  ? "h-auto"
                                  : "h-[80px] overflow-hidden",
                                {
                                  "justify-end": message.role === "user",
                                }
                              )}
                            >
                              {message.referencedDocs.map((doc, index) => (
                                <ResourceFile key={index} resource={doc} />
                              ))}
                            </div>
                          )}
                          {message.referencedDocs.length > 3 && (
                            <div
                              className="text-xs text-foreground cursor-pointer"
                              onClick={() => {
                                // toggle expand
                                setExpand(
                                  expand.includes(message.id)
                                    ? expand.filter((id) => id !== message.id)
                                    : [...expand, message.id]
                                );
                              }}
                            >
                              {expand.includes(message.id)
                                ? "Hide all files"
                                : "Show all files"}
                            </div>
                          )}
                        </>
                      )}

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
                            {/* <DropdownMenu>
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
                            </DropdownMenu> */}
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
                      // Store referenced docs as objects { name, url }
                      try {
                        const refs = docs.map((d: any) => ({
                          name: d.name,
                          url: d.url,
                        }));
                        setSelectedreferencedDocs(refs);
                      } catch (e) {
                        console.warn("Failed to map referenced docs:", e);
                      }
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
              <Button
                onClick={createNewSession}
                disabled={isCreatingChat}
                size="sm"
                variant="outline"
              >
                {isCreatingChat ? "Creating..." : "New Chat"}{" "}
                {!isCreatingChat && <Plus size={14} className="ml-2" />}
              </Button>
            </div>
            {/* <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search conversations..." className="pl-9" />
            </div> */}
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {isLoadingSessions && (
                <div className="space-y-2">
                  {[...Array(6)].map((_, i) => (
                    <Card
                      key={`skeleton-session-${i}`}
                      className="cursor-default"
                    >
                      <CardContent className="p-3">
                        <div className="space-y-2 animate-pulse">
                          <div className="h-4 w-1/2 bg-muted rounded" />
                          <div className="h-3 w-3/4 bg-muted rounded" />
                          <div className="flex items-center mt-2 space-x-2">
                            <div className="h-3 w-16 bg-muted rounded" />
                            <Separator orientation="vertical" className="h-3" />
                            <div className="h-3 w-10 bg-muted rounded" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
              {!isLoadingSessions &&
                chatSessions.map((chatSession) => (
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
                          <div className="font-medium text-sm truncate">
                            {chatSession.title}
                          </div>
                          <div className="text-xs text-muted-foreground mt-1 line-clamp-2 w-72">
                            {chatSession.lastMessage}
                          </div>
                          <div className="w-full flex items-center mt-2 text-xs text-muted-foreground">
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
                        <DropdownMenu>
                          <DropdownMenuTrigger>
                            <MoreHorizontal className="h-4 w-4" />
                          </DropdownMenuTrigger>
                          <DropdownMenuContent>
                            <DropdownMenuItem
                              onClick={() => deleteChatSession(chatSession.id)}
                            >
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
