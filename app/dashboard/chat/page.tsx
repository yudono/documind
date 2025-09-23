'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSession } from 'next-auth/react';
import { useSearchParams } from 'next/navigation';
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
  Eye
} from 'lucide-react';

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
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
  
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      content: 'Halo! Saya AI Konsultan Bisnis UMKM Anda. Saya dapat membantu:\n\n• Analisis dokumen bisnis (invoice, laporan keuangan, kontrak)\n• Strategi pemasaran dan pengembangan usaha\n• Konsultasi keuangan dan manajemen cash flow\n• Pembuatan proposal dan surat bisnis\n• Tips operasional untuk UMKM\n\nAda yang bisa saya bantu untuk bisnis Anda hari ini?',
      role: 'assistant',
      timestamp: new Date(),
    },
  ]);
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState<string>('current');
  const [showDocumentPicker, setShowDocumentPicker] = useState(false);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const { data: session } = useSession();
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Mock data for chat sessions
  const [chatSessions] = useState<ChatSession[]>([
    {
      id: 'current',
      title: 'Chat Saat Ini',
      lastMessage: 'Halo! Saya AI Konsultan Bisnis UMKM Anda...',
      timestamp: new Date(),
      messageCount: 1
    },
    {
      id: '1',
      title: 'Konsultasi Strategi Pemasaran',
      lastMessage: 'Bagaimana cara meningkatkan penjualan online untuk toko sembako?',
      timestamp: new Date(Date.now() - 86400000),
      messageCount: 15
    },
    {
      id: '2',
      title: 'Analisis Laporan Keuangan',
      lastMessage: 'Tolong analisis cash flow bulan Oktober ini',
      timestamp: new Date(Date.now() - 172800000),
      messageCount: 12
    },
    {
      id: '3',
      title: 'Konsultasi Kontrak Supplier',
      lastMessage: 'Tolong review kontrak kerjasama dengan supplier beras ini',
      timestamp: new Date(Date.now() - 259200000),
      messageCount: 18
    },
    {
      id: '4',
      title: 'Tips Manajemen Inventory',
      lastMessage: 'Bagaimana cara mengelola stok barang yang efisien?',
      timestamp: new Date(Date.now() - 345600000),
      messageCount: 9
    }
  ]);

  // Mock uploaded documents
  const [documents] = useState<Document[]>([
    {
      id: '1',
      name: 'Laporan Penjualan November 2024.pdf',
      type: 'PDF',
      uploadDate: new Date(Date.now() - 86400000)
    },
    {
      id: '2',
      name: 'Kontrak Supplier Beras.docx',
      type: 'DOCX',
      uploadDate: new Date(Date.now() - 172800000)
    },
    {
      id: '3',
      name: 'Data Keuangan Oktober 2024.xlsx',
      type: 'XLSX',
      uploadDate: new Date(Date.now() - 259200000)
    },
    {
      id: '4',
      name: 'Invoice Toko Sembako Jaya.pdf',
      type: 'PDF',
      uploadDate: new Date(Date.now() - 345600000)
    }
  ]);

  const scrollToBottom = () => {
    if (scrollAreaRef.current) {
      const scrollContainer = scrollAreaRef.current.querySelector('[data-radix-scroll-area-viewport]');
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
    const mode = searchParams.get('mode');
    const data = searchParams.get('data');
    
    if (mode === 'template' && data) {
      try {
        const parsedData = JSON.parse(data);
        setIsTemplateMode(true);
        setTemplateData(parsedData);
        
        // Create initial template message
        const templateMessage: Message = {
          id: 'template-init',
          content: `Saya akan membantu Anda membuat ${parsedData.templateName}. Berdasarkan informasi yang Anda berikan:\n\n${Object.entries(parsedData.formData).map(([key, value]) => `• ${key.replace('_', ' ')}: ${value}`).join('\n')}\n\nSaya akan memproses dan membuat dokumen untuk Anda...`,
          role: 'assistant',
          timestamp: new Date(),
        };
        
        setMessages(prev => [...prev, templateMessage]);
        
        // Auto-generate document after a delay
        setTimeout(() => {
          generateTemplateDocument(parsedData);
        }, 2000);
        
      } catch (error) {
        console.error('Error parsing template data:', error);
      }
    }
  }, [searchParams]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    }
  }, []);

  useEffect(() => {
    adjustTextareaHeight();
  }, [input, adjustTextareaHeight]);

  const generateTemplateDocument = (templateData: any) => {
    // Add typing indicator
    const typingMessage: Message = {
      id: 'generating',
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages(prev => [...prev, typingMessage]);

    // Simulate document generation
    setTimeout(() => {
      const documentMessage: Message = {
        id: `doc-${Date.now()}`,
        content: `Dokumen ${templateData.templateName} telah berhasil dibuat! Berikut adalah dokumen yang telah saya generate berdasarkan informasi yang Anda berikan.`,
        role: 'assistant',
        timestamp: new Date(),
        documentFile: {
          name: `${templateData.templateName}_${new Date().toISOString().split('T')[0]}.pdf`,
          type: 'PDF',
          downloadUrl: '#' // This would be a real URL in production
        }
      };

      setMessages(prev => prev.filter(msg => msg.id !== 'generating').concat(documentMessage));
    }, 3000);
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: input,
      role: 'user',
      timestamp: new Date(),
      referencedDocuments: selectedDocuments.length > 0 ? selectedDocuments : undefined
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setSelectedDocuments([]);
    setIsLoading(true);

    // Add typing indicator
    const typingMessage: Message = {
      id: 'typing',
      content: '',
      role: 'assistant',
      timestamp: new Date(),
      isTyping: true,
    };
    setMessages(prev => [...prev, typingMessage]);

    // Check if user is requesting document generation
    const isDocumentRequest = input.toLowerCase().includes('generate document') || 
                             input.toLowerCase().includes('buat dokumen') ||
                             input.toLowerCase().includes('create document');

    // Simulate AI response
    setTimeout(() => {
      let assistantMessage: Message;

      if (isDocumentRequest) {
        // Generate document response
        assistantMessage = {
          id: (Date.now() + 1).toString(),
          content: "Saya telah membuat dokumen sesuai permintaan Anda. Dokumen ini telah disesuaikan dengan kebutuhan bisnis UMKM dan siap untuk digunakan.",
          role: 'assistant',
          timestamp: new Date(),
          documentFile: {
            name: `Generated_Document_${new Date().toISOString().split('T')[0]}.pdf`,
            type: 'PDF',
            downloadUrl: '#' // This would be a real URL in production
          }
        };
      } else {
        // Regular chat response
        const responses = [
          "Baik, saya akan membantu analisis bisnis UMKM Anda! Berdasarkan dokumen yang Anda upload, saya melihat beberapa peluang untuk meningkatkan efisiensi operasional dan profitabilitas.",
          "Pertanyaan yang bagus untuk pengembangan bisnis! Mari saya analisis data keuangan Anda dan berikan rekomendasi strategis yang dapat diterapkan untuk UMKM.",
          "Saya memahami kebutuhan bisnis Anda. Berdasarkan tren pasar dan kondisi UMKM saat ini, berikut adalah analisis dan saran yang dapat membantu meningkatkan performa bisnis.",
          "Permintaan yang menarik! Saya akan membantu membuat dokumen bisnis yang sesuai dengan standar UMKM dan dapat langsung digunakan untuk operasional Anda.",
          "Dari analisis cash flow yang saya lakukan, terlihat ada beberapa area yang bisa dioptimalkan. Mari kita bahas strategi pengelolaan keuangan yang lebih efektif untuk bisnis Anda."
        ];
        
        assistantMessage = {
          id: (Date.now() + 1).toString(),
          content: responses[Math.floor(Math.random() * responses.length)],
          role: 'assistant',
          timestamp: new Date(),
        };
      }

      setMessages(prev => prev.filter(msg => msg.id !== 'typing').concat(assistantMessage));
      setIsLoading(false);
    }, 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
  };

  const toggleDocumentSelection = (docId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(docId) 
        ? prev.filter(id => id !== docId)
        : [...prev, docId]
    );
  };

  const handleAtSymbol = () => {
    setShowDocumentPicker(true);
  };

  const newChat = () => {
    setMessages([{
      id: '1',
      content: 'Halo! Saya AI Konsultan Bisnis UMKM Anda. Saya dapat membantu:\n\n• Analisis dokumen bisnis (invoice, laporan keuangan, kontrak)\n• Strategi pemasaran dan pengembangan usaha\n• Konsultasi keuangan dan manajemen cash flow\n• Pembuatan proposal dan surat bisnis\n• Tips operasional untuk UMKM\n\nAda yang bisa saya bantu untuk bisnis Anda hari ini?',
      role: 'assistant',
      timestamp: new Date(),
    }]);
    setSelectedSession('current');
  };

  return (
    <TooltipProvider>
      <div className="flex h-screen bg-background">
        {/* Sidebar with Chat History */}
        <div className="w-80 border-r bg-muted/10 flex flex-col">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">Chat History</h2>
              <Button onClick={newChat} size="sm" variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Chat
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search conversations..." className="pl-9" />
            </div>
          </div>
          
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-2">
              {chatSessions.map((chatSession) => (
                <Card 
                  key={chatSession.id}
                  className={`cursor-pointer transition-colors hover:bg-muted/50 ${
                    selectedSession === chatSession.id ? 'bg-muted border-primary' : ''
                  }`}
                  onClick={() => setSelectedSession(chatSession.id)}
                >
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-sm truncate">{chatSession.title}</h3>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {chatSession.lastMessage}
                        </p>
                        <div className="flex items-center mt-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(chatSession.timestamp)}
                          <Separator orientation="vertical" className="mx-2 h-3" />
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

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    <Bot className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h1 className="font-semibold">AI Document Assistant</h1>
                  <p className="text-sm text-muted-foreground">
                    {session?.user?.name ? `Chatting with ${session.user.name}` : 'Ready to help'}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="secondary" className="px-3 py-1">
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
            <div className="max-w-3xl mx-auto space-y-6">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`group flex items-start space-x-3 ${
                    message.role === 'user' ? 'flex-row-reverse space-x-reverse' : ''
                  }`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback className={message.role === 'assistant' ? 'bg-primary text-primary-foreground' : 'bg-muted'}>
                      {message.role === 'assistant' ? <Bot className="h-4 w-4" /> : <User className="h-4 w-4" />}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className={`flex-1 space-y-2 ${message.role === 'user' ? 'flex flex-col items-end' : ''}`}>
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.isTyping ? (
                        <div className="flex items-center space-x-2 py-2">
                          <div className="flex space-x-1">
                            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                          </div>
                          <span className="text-sm text-muted-foreground">AI is thinking...</span>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
                          
                          {/* Document File Display */}
                          {message.documentFile && (
                            <div className="mt-3 p-3 bg-background border rounded-lg">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-3">
                                  <div className="p-2 bg-primary/10 rounded-lg">
                                    <FileText className="h-5 w-5 text-primary" />
                                  </div>
                                  <div>
                                    <p className="font-medium text-sm">{message.documentFile.name}</p>
                                    <p className="text-xs text-muted-foreground">{message.documentFile.type} Document</p>
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                        <Eye className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Preview Document</TooltipContent>
                                  </Tooltip>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button variant="outline" size="sm" className="h-8 w-8 p-0">
                                        <Download className="h-4 w-4" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent>Download Document</TooltipContent>
                                  </Tooltip>
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {message.referencedDocuments && message.referencedDocuments.length > 0 && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              {message.referencedDocuments.map((docId) => {
                                const doc = documents.find(d => d.id === docId);
                                return doc ? (
                                  <Badge key={docId} variant="secondary" className="text-xs">
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
                    
                    <div className={`flex items-center space-x-2 text-xs text-muted-foreground ${
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}>
                      <span>{formatTime(message.timestamp)}</span>
                      {message.role === 'assistant' && !message.isTyping && (
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
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Regenerate</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Good response</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Poor response</TooltipContent>
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
            <div className="max-w-3xl mx-auto">
              {/* Referenced Documents */}
              {selectedDocuments.length > 0 && (
                <div className="mb-3 flex flex-wrap gap-2">
                  {selectedDocuments.map((docId) => {
                    const doc = documents.find(d => d.id === docId);
                    return doc ? (
                      <Badge key={docId} variant="secondary" className="px-2 py-1">
                        <File className="h-3 w-3 mr-1" />
                        {doc.name}
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                          onClick={() => toggleDocumentSelection(docId)}
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </Badge>
                    ) : null;
                  })}
                </div>
              )}

              <div className="flex items-end space-x-2">
                <div className="flex space-x-1">
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setShowDocumentPicker(!showDocumentPicker)}
                        className={showDocumentPicker ? 'bg-muted' : ''}
                      >
                        <Paperclip className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Attach documents</TooltipContent>
                  </Tooltip>
                  
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="sm" onClick={handleAtSymbol}>
                        <AtSign className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Reference documents</TooltipContent>
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
                            selectedDocuments.includes(doc.id) 
                              ? 'bg-primary/10 border border-primary' 
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => toggleDocumentSelection(doc.id)}
                        >
                          <File className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{doc.name}</p>
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
                Press Enter to send • Shift+Enter for new line • Use @ to reference documents
              </p>
            </div>
          </div>
        </div>
      </div>
    </TooltipProvider>
  );
}