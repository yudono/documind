"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import {
  HelpCircle,
  Search,
  Book,
  MessageCircle,
  Mail,
  Phone,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  FileText,
  Video,
  Download,
  Star,
  Clock,
  CheckCircle,
  AlertCircle,
  Users,
  Zap,
  Shield,
  Globe,
  Send,
  ArrowRight,
} from "lucide-react";

interface FAQ {
  id: string;
  question: string;
  answer: string;
  category: string;
  helpful: number;
}

interface Guide {
  id: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  difficulty: "Beginner" | "Intermediate" | "Advanced";
  icon: React.ReactNode;
}

interface SupportTicket {
  id: string;
  subject: string;
  status: "open" | "in-progress" | "resolved";
  priority: "low" | "medium" | "high";
  createdAt: Date;
  lastUpdate: Date;
}

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [openFAQs, setOpenFAQs] = useState<string[]>([]);

  // Support form state
  const [supportForm, setSupportForm] = useState({
    subject: "",
    category: "",
    priority: "medium",
    description: "",
  });

  // Mock FAQs data
  const faqs: FAQ[] = [
    {
      id: "1",
      question: "Bagaimana cara upload dan analisis dokumen bisnis UMKM?",
      answer:
        'Untuk upload dokumen, buka halaman "Dokumen Saya" dan drag & drop file atau klik tombol upload. Format yang didukung: PDF, DOCX, dan TXT. Setelah diupload, AI akan otomatis menganalisis dokumen dan memberikan insight seperti ringkasan, poin penting, analisis keuangan, dan rekomendasi bisnis.',
      category: "documents",
      helpful: 45,
    },
    {
      id: "2",
      question: "Format file apa saja yang didukung untuk dokumen UMKM?",
      answer:
        "Kami mendukung file PDF, Microsoft Word (.docx), dan teks (.txt). Setiap file maksimal 10MB. Kami sedang mengembangkan dukungan untuk Excel dan PowerPoint yang sangat berguna untuk laporan keuangan dan presentasi bisnis UMKM.",
      category: "documents",
      helpful: 38,
    },
    {
      id: "3",
      question: "Bagaimana fitur konsultasi AI UMKM bekerja?",
      answer:
        "Fitur konsultasi AI memungkinkan Anda bertanya tentang strategi bisnis, analisis keuangan, dan solusi operasional UMKM. Anda bisa referensi dokumen tertentu dengan simbol @ atau attach langsung. AI memiliki akses ke semua dokumen dan memberikan jawaban kontekstual sesuai kebutuhan bisnis Anda.",
      category: "ai-chat",
      helpful: 52,
    },
    {
      id: "4",
      question: "Bisakah saya membuat dokumen bisnis dari template?",
      answer:
        'Ya! Buka halaman "Dokumen Saya" dan pilih tab "Generate Dokumen". Pilih dari berbagai template seperti invoice UMKM, surat penawaran, laporan keuangan, dan kontrak kerjasama. Isi informasi yang diperlukan dan AI akan membuat dokumen profesional untuk bisnis Anda.',
      category: "documents",
      helpful: 29,
    },
    {
      id: "5",
      question: "Bagaimana keamanan data bisnis UMKM saya?",
      answer:
        "Kami sangat serius dengan keamanan data. Semua dokumen dienkripsi saat transfer dan penyimpanan. Kami menggunakan standar keamanan industri dan mematuhi regulasi privasi. Dokumen bisnis Anda tidak pernah dibagikan ke pihak ketiga dan bisa dihapus kapan saja.",
      category: "security",
      helpful: 67,
    },
    {
      id: "6",
      question: "Apa saja batas penggunaan untuk setiap paket UMKM?",
      answer:
        "Paket Starter gratis: 25 dokumen dan 50 konsultasi AI per bulan. Paket Pro: 500 dokumen dan 200 konsultasi AI. Paket Enterprise: unlimited. Cek halaman Tagihan & Penggunaan untuk detail penggunaan Anda saat ini.",
      category: "billing",
      helpful: 41,
    },
  ];

  // Mock guides data
  const guides: Guide[] = [
    {
      id: "1",
      title: "Memulai Analisis Dokumen UMKM",
      description:
        "Pelajari cara upload, analisis, dan ekstrak insight dari dokumen bisnis Anda",
      category: "Memulai",
      readTime: "5 menit",
      difficulty: "Beginner",
      icon: <FileText className="h-5 w-5" />,
    },
    {
      id: "2",
      title: "Fitur Konsultasi AI Lanjutan",
      description:
        "Kuasai referensi dokumen, pergantian konteks, dan query lanjutan untuk UMKM",
      category: "Konsultasi AI",
      readTime: "8 menit",
      difficulty: "Intermediate",
      icon: <MessageCircle className="h-5 w-5" />,
    },
    {
      id: "3",
      title: "Template Dokumen Bisnis UMKM",
      description:
        "Buat dokumen profesional menggunakan template AI untuk invoice, kontrak, dan laporan",
      category: "Generate Dokumen",
      readTime: "6 menit",
      difficulty: "Beginner",
      icon: <Zap className="h-5 w-5" />,
    },
    {
      id: "4",
      title: "Panduan Integrasi API",
      description:
        "Integrasikan API pemrosesan dokumen ke dalam aplikasi bisnis Anda",
      category: "API",
      readTime: "15 menit",
      difficulty: "Advanced",
      icon: <Globe className="h-5 w-5" />,
    },
    {
      id: "5",
      title: "Praktik Keamanan Terbaik UMKM",
      description:
        "Jaga keamanan dokumen dan akun bisnis dengan rekomendasi ini",
      category: "Keamanan",
      readTime: "7 menit",
      difficulty: "Intermediate",
      icon: <Shield className="h-5 w-5" />,
    },
  ];

  // Mock support tickets
  const supportTickets: SupportTicket[] = [
    {
      id: "TICK-001",
      subject: "Upload dokumen laporan keuangan UMKM gagal",
      status: "in-progress",
      priority: "high",
      createdAt: new Date("2024-01-15"),
      lastUpdate: new Date("2024-01-16"),
    },
    {
      id: "TICK-002",
      subject: "Pertanyaan tentang batas konsultasi AI untuk UMKM",
      status: "resolved",
      priority: "medium",
      createdAt: new Date("2024-01-10"),
      lastUpdate: new Date("2024-01-12"),
    },
  ];

  const categories = [
    { value: "all", label: "Semua Kategori" },
    { value: "documents", label: "Dokumen" },
    { value: "ai-chat", label: "Konsultasi AI" },
    { value: "billing", label: "Tagihan" },
    { value: "security", label: "Keamanan" },
  ];

  const filteredFAQs = faqs.filter((faq) => {
    const matchesSearch =
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "all" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const toggleFAQ = (faqId: string) => {
    setOpenFAQs((prev) =>
      prev.includes(faqId)
        ? prev.filter((id) => id !== faqId)
        : [...prev, faqId]
    );
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "open":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            Terbuka
          </Badge>
        );
      case "in-progress":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Dalam Proses
          </Badge>
        );
      case "resolved":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            Selesai
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "high":
        return <Badge variant="destructive">Tinggi</Badge>;
      case "medium":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            Sedang
          </Badge>
        );
      case "low":
        return <Badge variant="secondary">Rendah</Badge>;
      default:
        return <Badge variant="secondary">{priority}</Badge>;
    }
  };

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Beginner":
        return "bg-green-100 text-green-800";
      case "Intermediate":
        return "bg-yellow-100 text-yellow-800";
      case "Advanced":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleSupportSubmit = () => {
    // Handle support form submission
    console.log("Support ticket submitted:", supportForm);
    setSupportForm({
      subject: "",
      category: "",
      priority: "medium",
      description: "",
    });
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-20 flex items-center w-full">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="font-semibold">Bantuan & Dukungan</h1>
              <p className="text-sm text-muted-foreground">
                Temukan jawaban, panduan, dan dapatkan bantuan untuk UMKM Anda
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-8">
        {/* <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Bantuan & Dukungan</h1>
        <p className="text-slate-600">Temukan jawaban, panduan, dan dapatkan bantuan untuk UMKM Anda</p>
      </div> */}

        <Tabs defaultValue="faq" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="faq">FAQ</TabsTrigger>
            <TabsTrigger value="guides">Panduan</TabsTrigger>
            <TabsTrigger value="support">Dukungan</TabsTrigger>
            <TabsTrigger value="contact">Kontak</TabsTrigger>
          </TabsList>

          {/* FAQ Tab */}
          <TabsContent value="faq" className="space-y-6">
            {/* Search and Filter */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                      <Input
                        placeholder="Cari pertanyaan yang sering diajukan..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {categories.map((category) => (
                      <Button
                        key={category.value}
                        variant={
                          selectedCategory === category.value
                            ? "default"
                            : "outline"
                        }
                        size="sm"
                        onClick={() => setSelectedCategory(category.value)}
                      >
                        {category.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* FAQ List */}
            <div className="space-y-4">
              {filteredFAQs.map((faq) => (
                <Card key={faq.id}>
                  <Collapsible
                    open={openFAQs.includes(faq.id)}
                    onOpenChange={() => toggleFAQ(faq.id)}
                  >
                    <CollapsibleTrigger asChild>
                      <CardHeader className="cursor-pointer hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-medium text-left">
                            {faq.question}
                          </CardTitle>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-xs">
                              {faq.helpful} membantu
                            </Badge>
                            {openFAQs.includes(faq.id) ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </div>
                        </div>
                      </CardHeader>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <CardContent className="pt-0">
                        <p className="text-muted-foreground mb-4">
                          {faq.answer}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                            <span>Apakah ini membantu?</span>
                            <Button variant="ghost" size="sm">
                              👍 Ya
                            </Button>
                            <Button variant="ghost" size="sm">
                              👎 Tidak
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </CollapsibleContent>
                  </Collapsible>
                </Card>
              ))}
            </div>

            {filteredFAQs.length === 0 && (
              <Card>
                <CardContent className="text-center py-12">
                  <HelpCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">
                    FAQ tidak ditemukan
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Coba sesuaikan kata kunci pencarian atau filter kategori
                  </p>
                  <Button variant="outline">Hubungi Dukungan</Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Guides Tab */}
          <TabsContent value="guides" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {guides.map((guide) => (
                <Card
                  key={guide.id}
                  className="hover:shadow-md transition-shadow cursor-pointer"
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-primary/10 rounded-lg">
                          {guide.icon}
                        </div>
                        <div>
                          <Badge
                            variant="outline"
                            className={getDifficultyColor(guide.difficulty)}
                          >
                            {guide.difficulty}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    <CardTitle className="text-lg">{guide.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground mb-4">
                      {guide.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="h-4 w-4 mr-1" />
                          {guide.readTime}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {guide.category}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Quick Links */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ExternalLink className="h-5 w-5 mr-2" />
                  Sumber Daya Tambahan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <Video className="h-5 w-5" />
                      <div className="text-left">
                        <p className="font-medium">Tutorial Video</p>
                        <p className="text-sm text-muted-foreground">
                          Tonton panduan langkah demi langkah
                        </p>
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <Download className="h-5 w-5" />
                      <div className="text-left">
                        <p className="font-medium">Unduh Panduan PDF</p>
                        <p className="text-sm text-muted-foreground">
                          Dokumentasi offline
                        </p>
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <Book className="h-5 w-5" />
                      <div className="text-left">
                        <p className="font-medium">Dokumentasi API</p>
                        <p className="text-sm text-muted-foreground">
                          Sumber daya developer
                        </p>
                      </div>
                    </div>
                  </Button>
                  <Button
                    variant="outline"
                    className="justify-start h-auto p-4"
                  >
                    <div className="flex items-center space-x-3">
                      <Users className="h-5 w-5" />
                      <div className="text-left">
                        <p className="font-medium">Forum Komunitas UMKM</p>
                        <p className="text-sm text-muted-foreground">
                          Terhubung dengan pengguna lain
                        </p>
                      </div>
                    </div>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Support Tab */}
          <TabsContent value="support" className="space-y-6">
            {/* Support Tickets */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <MessageCircle className="h-5 w-5 mr-2" />
                    Tiket Dukungan Anda
                  </div>
                  <Button>Buat Tiket Baru</Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {supportTickets.length > 0 ? (
                  <div className="space-y-4">
                    {supportTickets.map((ticket) => (
                      <div
                        key={ticket.id}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center space-x-2">
                            <p className="font-medium">{ticket.subject}</p>
                            {getStatusBadge(ticket.status)}
                            {getPriorityBadge(ticket.priority)}
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Tiket #{ticket.id} • Dibuat{" "}
                            {ticket.createdAt.toLocaleDateString()}
                          </p>
                        </div>
                        <Button variant="outline" size="sm">
                          Lihat Detail
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-medium mb-2">
                      Tidak ada tiket dukungan
                    </h3>
                    <p className="text-muted-foreground">
                      Anda belum membuat tiket dukungan apapun
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Create Support Ticket */}
            <Card>
              <CardHeader>
                <CardTitle>Create Support Ticket</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      placeholder="Brief description of your issue"
                      value={supportForm.subject}
                      onChange={(e) =>
                        setSupportForm((prev) => ({
                          ...prev,
                          subject: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="category">Category</Label>
                    <select
                      id="category"
                      className="w-full p-2 border border-input rounded-md"
                      value={supportForm.category}
                      onChange={(e) =>
                        setSupportForm((prev) => ({
                          ...prev,
                          category: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select a category</option>
                      <option value="technical">Technical Issue</option>
                      <option value="billing">Billing Question</option>
                      <option value="feature">Feature Request</option>
                      <option value="account">Account Issue</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="priority">Priority</Label>
                  <select
                    id="priority"
                    className="w-full p-2 border border-input rounded-md"
                    value={supportForm.priority}
                    onChange={(e) =>
                      setSupportForm((prev) => ({
                        ...prev,
                        priority: e.target.value,
                      }))
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Please provide detailed information about your issue..."
                    rows={5}
                    value={supportForm.description}
                    onChange={(e) =>
                      setSupportForm((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                  />
                </div>
                <Button onClick={handleSupportSubmit} className="w-full">
                  <Send className="h-4 w-4 mr-2" />
                  Submit Ticket
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Contact Tab */}
          <TabsContent value="contact" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Contact Methods */}
              <Card>
                <CardHeader>
                  <CardTitle>Get in Touch</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Mail className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Email Support</p>
                      <p className="text-sm text-muted-foreground">
                        support@documentassistant.com
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Response within 24 hours
                      </p>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <MessageCircle className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Live Chat</p>
                      <p className="text-sm text-muted-foreground">
                        Available 9 AM - 6 PM PST
                      </p>
                      <Button variant="outline" size="sm" className="mt-2">
                        Start Chat
                      </Button>
                    </div>
                  </div>
                  <Separator />
                  <div className="flex items-center space-x-4">
                    <div className="p-3 bg-primary/10 rounded-lg">
                      <Phone className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">Phone Support</p>
                      <p className="text-sm text-muted-foreground">
                        +1 (555) 123-4567
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Enterprise customers only
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Office Information */}
              <Card>
                <CardHeader>
                  <CardTitle>Office Locations</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <h4 className="font-medium">San Francisco HQ</h4>
                    <p className="text-sm text-muted-foreground">
                      123 Innovation Drive
                      <br />
                      San Francisco, CA 94105
                      <br />
                      United States
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium">London Office</h4>
                    <p className="text-sm text-muted-foreground">
                      456 Tech Street
                      <br />
                      London EC2A 4DP
                      <br />
                      United Kingdom
                    </p>
                  </div>
                  <Separator />
                  <div>
                    <h4 className="font-medium">Business Hours</h4>
                    <p className="text-sm text-muted-foreground">
                      Monday - Friday: 9:00 AM - 6:00 PM PST
                      <br />
                      Saturday: 10:00 AM - 2:00 PM PST
                      <br />
                      Sunday: Closed
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Page */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                  System Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">API Services</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 border border-green-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      <span className="text-sm font-medium">
                        Document Processing
                      </span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-green-100 text-green-800"
                    >
                      Operational
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm font-medium">AI Chat</span>
                    </div>
                    <Badge
                      variant="secondary"
                      className="bg-yellow-100 text-yellow-800"
                    >
                      Degraded
                    </Badge>
                  </div>
                </div>
                <div className="mt-4">
                  <Button variant="outline" size="sm">
                    <ExternalLink className="h-4 w-4 mr-2" />
                    View Status Page
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
