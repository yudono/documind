"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
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
import { DocumentItem, FilesDocumentsDialog } from "@/components/file-dialog";
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
  Coins,
  Square, // Add Coins icon for credits
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/ui/code-block";
import { toast } from "sonner";
import ResourceFile from "@/components/resource-file";
import { cn } from "@/lib/utils";
import { normalizeText } from "@/lib/normalize-text";
import ChatSessionsSidebar from "@/components/chat/chat-sessions-sidebar";
import ChatMessagesRich from "@/components/chat/chat-messages-rich";
import ChatComposer from "@/components/chat/chat-composer";

export interface Message {
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

export interface ChatSession {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

// Speech recognition types shim
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyRecognition = any;

export default function ChatPage() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const router = useRouter();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  // Speech recognition refs/state
  const [isRecording, setIsRecording] = useState(false);
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    interimTranscript,
    finalTranscript,
  } = useSpeechRecognition();
  const supportsSpeech =
    typeof window !== "undefined" && Boolean(browserSupportsSpeechRecognition);

  // Template mode state
  const [isTemplateMode, setIsTemplateMode] = useState(false);
  const [templateData, setTemplateData] = useState<any>(null);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
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

  const toggleDocumentSelection = (doc: DocumentItem) => {
    setItems((prev) =>
      prev.some((d) => d.id === doc.id)
        ? prev.filter((d) => d.id !== doc.id)
        : [...prev, doc]
    );
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

  // Speech recognition types shim
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  type AnyRecognition = any;

  // Reflect listening state onto our local UI state
  useEffect(() => {
    setIsRecording(listening);
  }, [listening]);

  // Auto-send when a final transcript is available; update input for interim
  useEffect(() => {
    const finalText = (finalTranscript as unknown as string) || "";
    if (finalText && finalText.trim().length > 0) {
      // sendMessage(finalText.trim());
      resetTranscript();
      return;
    }
    const interim =
      (interimTranscript as unknown as string) || transcript || "";
    if (interim && interim.trim().length > 0) {
      setInput(interim.trim());
    }
  }, [finalTranscript, interimTranscript, transcript]);

  // Send message function with credit consumption
  const sendMessage = async (overrideContent?: string) => {
    const contentToSend = overrideContent ?? input;
    if (!contentToSend.trim() || isLoading) return;

    // Capture current selected documents for context before clearing
    const docsForContext = items.slice();
    // Capture current referenced docs before clearing
    const refsForContext = Array.isArray(selectedreferencedDocs)
      ? [...selectedreferencedDocs]
      : [];

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
      content: contentToSend,
      role: "user",
      timestamp: new Date(),
      referencedDocs: selectedreferencedDocs,
    };

    setMessages((prev) => [...prev, userMessage]);
    if (!overrideContent) setInput("");
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
      // Prepare context from selected documents captured earlier
      const context =
        docsForContext.length > 0
          ? `Referenced documents: ${docsForContext
              .map((doc) => doc.name)
              .join(", ")}`
          : undefined;

      // Clear selection after capturing context
      setItems([]);
      setSelectedreferencedDocs([]);

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
          referencedDocs: refsForContext,
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

  // Speech recording controls
  const ensureMicPermission = async (): Promise<boolean> => {
    if (!navigator?.mediaDevices?.getUserMedia) return true; // skip preflight if unavailable
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast.error(
          "Akses mikrofon ditolak. Izinkan mikrofon lalu reload halaman."
        );
      } else if (name === "NotFoundError") {
        toast.error("Perangkat mikrofon tidak ditemukan.");
      } else {
        toast.error("Tidak bisa mengakses mikrofon.");
      }
      return false;
    }
  };

  const startRecording = async () => {
    if (!supportsSpeech) {
      toast.error("Browser tidak mendukung speech recognition.");
      return;
    }
    const ok = await ensureMicPermission();
    if (!ok) return;
    try {
      await SpeechRecognition.startListening({
        continuous: false,
        language: "id-ID",
      });
    } catch (e) {
      console.warn("Failed to start recognition:", e);
      toast.error("Tidak bisa mulai rekam.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    try {
      SpeechRecognition.stopListening();
    } catch {}
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (listening) stopRecording();
    else startRecording();
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };
  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Main Chat Area */}
        <div className="relative flex-1 flex flex-col overflow-hidden">
          {/* Overlay gradien mengikuti gaya landing */}
          <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />
          {/* Header */}
          <div className="glass border-b p-4 h-20 flex items-center w-full">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center space-x-3">
                <Bot className="h-8 w-8" />
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
          <ChatMessagesRich
            ref={scrollAreaRef as any}
            messages={messages as any}
            isLoadingMessages={isLoadingMessages}
            isLoadingSessions={isLoadingSessions}
          />

          {/* Input Area */}
          <ChatComposer
            items={items}
            setItems={setItems}
            setSelectedreferencedDocs={setSelectedreferencedDocs}
            toggleDocumentSelection={toggleDocumentSelection}
            textareaRef={textareaRef}
            input={input}
            setInput={setInput}
            handleKeyPress={handleKeyPress}
            isLoading={isLoading}
            isRecording={isRecording}
            toggleRecording={toggleRecording}
            supportsSpeech={supportsSpeech}
            sendMessage={sendMessage}
          />
        </div>

        {/* Sidebar with Chat History */}
        <ChatSessionsSidebar
          sessions={chatSessions}
          selectedId={selectedSession}
          isLoadingSessions={isLoadingSessions}
          isCreatingChat={isCreatingChat}
          onCreateNew={createNewSession}
          onSelect={switchToSession}
          onDelete={deleteChatSession}
        />
      </div>
    </TooltipProvider>
  );
}
