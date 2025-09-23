'use client';

import { useState, useCallback, useRef } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Progress } from '@/components/ui/progress';
import { 
  Upload, 
  FileText, 
  Search, 
  Grid3X3, 
  List, 
  Eye, 
  Download, 
  Trash2,
  Filter,
  Calendar,
  User,
  FileIcon,
  Brain,
  BarChart3,
  Key,
  Clock,
  FileSearch,
  Sparkles,
  Share,
  Plus,
  FileImage,
  FileSpreadsheet,
  PenTool
} from 'lucide-react';

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  status: 'processing' | 'ready' | 'error';
  preview?: string;
  content?: string;
  analysis?: AnalysisResult;
}

interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  readingTime: number;
  wordCount: number;
  topics: string[];
}

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  fields: string[];
  category: string;
}

export default function MyDocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([
    {
      id: '1',
      name: 'Invoice Toko Sembako Jaya - November 2024.pdf',
      type: 'application/pdf',
      size: 1248576,
      uploadDate: '2024-11-15',
      status: 'ready',
      content: 'Invoice untuk pembelian bahan makanan dan minuman untuk toko sembako...',
      analysis: {
        summary: 'Invoice pembelian barang dagangan dari supplier utama dengan total Rp 15.750.000. Menunjukkan pola pembelian rutin bulanan dengan margin keuntungan yang sehat.',
        keyPoints: ['Total pembelian Rp 15.750.000', 'Diskon supplier 5%', 'Estimasi margin keuntungan 35%', 'Stok untuk 2 minggu operasional'],
        sentiment: 'positive',
        readingTime: 5,
        wordCount: 850,
        topics: ['Pembelian Barang', 'Manajemen Stok', 'Keuangan UMKM', 'Supplier Management']
      }
    },
    {
      id: '2',
      name: 'Laporan Laba Rugi Oktober 2024.xlsx',
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      size: 856000,
      uploadDate: '2024-11-01',
      status: 'ready',
      content: 'Laporan keuangan bulanan menunjukkan pendapatan dan pengeluaran...',
      analysis: {
        summary: 'Laporan laba rugi menunjukkan pertumbuhan pendapatan 18% dibanding bulan sebelumnya dengan total omzet Rp 45.2 juta dan laba bersih Rp 12.8 juta.',
        keyPoints: ['Omzet naik 18% menjadi Rp 45.2 juta', 'Laba bersih Rp 12.8 juta (28% margin)', 'Biaya operasional terkendali', 'Penjualan online meningkat 35%'],
        sentiment: 'positive',
        readingTime: 7,
        wordCount: 1200,
        topics: ['Kinerja Keuangan', 'Analisis Pendapatan', 'Manajemen Biaya']
      }
    },
    {
      id: '3',
      name: 'Kontrak Kerjasama Supplier Beras.pdf',
      type: 'application/pdf',
      size: 1856000,
      uploadDate: '2024-10-25',
      status: 'ready',
      content: 'Kontrak kerjasama dengan supplier beras untuk pasokan bulanan...',
      analysis: {
        summary: 'Kontrak kerjasama dengan CV Beras Sejahtera untuk pasokan beras premium 5 ton per bulan dengan harga Rp 12.500/kg. Kontrak berlaku 1 tahun dengan opsi perpanjangan.',
        keyPoints: ['Pasokan 5 ton/bulan beras premium', 'Harga Rp 12.500/kg (kompetitif)', 'Kontrak 1 tahun + opsi perpanjangan', 'Pembayaran 30 hari setelah delivery'],
        sentiment: 'positive',
        readingTime: 8,
        wordCount: 1450,
        topics: ['Kontrak Supplier', 'Manajemen Pasokan', 'Negosiasi Harga', 'Kerjasama Bisnis']
      }
    },
    {
      id: '4',
      name: 'Surat Penawaran Catering Kantor.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 645000,
      uploadDate: '2024-10-20',
      status: 'ready',
      content: 'Surat penawaran layanan catering untuk kantor dan acara perusahaan...',
      analysis: {
        summary: 'Surat penawaran layanan catering harian untuk 50 karyawan dengan menu bervariasi. Harga Rp 25.000/porsi dengan potensi kontrak 6 bulan senilai Rp 195 juta.',
        keyPoints: ['Target 50 porsi/hari', 'Harga Rp 25.000/porsi', 'Menu bervariasi 4 minggu', 'Potensi kontrak Rp 195 juta/6 bulan'],
        sentiment: 'positive',
        readingTime: 6,
        wordCount: 980,
        topics: ['Penawaran Bisnis', 'Layanan Catering', 'Strategi Penjualan', 'B2B Marketing']
      }
    },
    {
      id: '5',
      name: 'Catatan Rapat Pengembangan Produk.txt',
      type: 'text/plain',
      size: 12800,
      uploadDate: '2024-10-18',
      status: 'processing',
      content: 'Catatan rapat membahas pengembangan produk baru dan strategi pemasaran...'
    }
  ]);
  
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<DocumentTemplate | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const documentTemplates: DocumentTemplate[] = [
    {
      id: '1',
      name: 'Invoice UMKM',
      description: 'Template invoice untuk usaha kecil dan menengah',
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      fields: ['Nama Pelanggan', 'Nomor Invoice', 'Tanggal', 'Daftar Barang/Jasa', 'Total Harga'],
      category: 'Keuangan'
    },
    {
      id: '2',
      name: 'Surat Penawaran',
      description: 'Template surat penawaran produk/jasa untuk calon klien',
      icon: <PenTool className="h-8 w-8 text-green-600" />,
      fields: ['Nama Perusahaan', 'Produk/Jasa', 'Harga', 'Syarat & Ketentuan'],
      category: 'Pemasaran'
    },
    {
      id: '3',
      name: 'Laporan Keuangan Bulanan',
      description: 'Template laporan keuangan sederhana untuk UMKM',
      icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
      fields: ['Pendapatan', 'Pengeluaran', 'Laba Rugi', 'Arus Kas'],
      category: 'Keuangan'
    },
    {
      id: '4',
      name: 'Kontrak Kerjasama',
      description: 'Template kontrak kerjasama dengan supplier atau mitra bisnis',
      icon: <FileIcon className="h-8 w-8 text-orange-600" />,
      fields: ['Pihak Pertama', 'Pihak Kedua', 'Ruang Lingkup', 'Syarat & Ketentuan'],
      category: 'Legal'
    },
    {
      id: '5',
      name: 'Proposal Usaha',
      description: 'Template proposal untuk pengajuan modal atau kerjasama',
      icon: <FileSpreadsheet className="h-8 w-8 text-indigo-600" />,
      fields: ['Ringkasan Eksekutif', 'Analisis Pasar', 'Proyeksi Keuangan', 'Tim'],
      category: 'Bisnis'
    },
    {
      id: '6',
      name: 'Surat Izin Usaha',
      description: 'Template surat permohonan izin usaha ke instansi terkait',
      icon: <FileText className="h-8 w-8 text-red-600" />,
      fields: ['Data Pemohon', 'Jenis Usaha', 'Lokasi', 'Dokumen Pendukung'],
      category: 'Legal'
    }
  ];

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setIsUploading(true);
    setIsAnalyzing(true);
    
    // Simulate upload and analysis
    setTimeout(() => {
      const newDocuments: Document[] = acceptedFiles.map((file, index) => {
        const mockAnalysis: AnalysisResult = {
          summary: `Analisis AI untuk ${file.name}. Dokumen ini berisi informasi penting untuk bisnis UMKM dengan insight strategis yang dapat ditindaklanjuti.`,
          keyPoints: [
            'Potensi peningkatan efisiensi operasional',
            'Peluang pengembangan pasar baru',
            'Rekomendasi optimalisasi keuangan'
          ],
          sentiment: Math.random() > 0.5 ? 'positive' : 'neutral',
          readingTime: Math.floor(Math.random() * 10) + 3,
          wordCount: Math.floor(Math.random() * 2000) + 500,
          topics: ['Analisis Bisnis UMKM', 'Strategi Pemasaran', 'Manajemen Keuangan']
        };

        return {
          id: Date.now().toString() + index,
          name: file.name,
          type: file.type,
          size: file.size,
          uploadDate: new Date().toISOString().split('T')[0],
          status: 'ready' as const,
          content: `Konten dokumen ${file.name}. Berisi informasi bisnis yang telah diekstrak dan dianalisis untuk memberikan insight yang berguna bagi UMKM.`,
          analysis: mockAnalysis
        };
      });
      
      setDocuments(prev => [...prev, ...newDocuments]);
      setIsUploading(false);
      setIsAnalyzing(false);
      if (newDocuments.length > 0) {
        setSelectedDocument(newDocuments[0]);
      }
    }, 3000);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/plain': ['.txt'],
    },
    multiple: true,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('text')) return '📃';
    return '📁';
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-100';
      case 'negative': return 'text-red-600 bg-red-100';
      default: return 'text-blue-600 bg-blue-100';
    }
  };

  const filteredDocuments = documents.filter(doc =>
    doc.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    if (selectedFiles) {
      onDrop(Array.from(selectedFiles));
    }
  };

  const handleTemplateSelect = (template: DocumentTemplate) => {
    setSelectedTemplate(template);
    // In a real implementation, this would open a form to fill out the template
    console.log('Selected template:', template);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">My Documents</h1>
        <p className="text-slate-600">Read, analyze, and generate documents with AI assistance</p>
      </div>

      <Tabs defaultValue="read" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="read">Read & Analyze</TabsTrigger>
          <TabsTrigger value="create">Generate Documents</TabsTrigger>
        </TabsList>
        
        <TabsContent value="read" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
            {/* Upload and File List */}
            <div className="lg:col-span-1">
              <Card className="mb-6">
                <CardHeader>
                  <CardTitle className="text-lg">Upload Document</CardTitle>
                  <CardDescription>
                    Upload files for AI analysis
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept=".pdf,.docx,.txt"
                    onChange={handleFileChange}
                    className="hidden"
                  />
                  <div
                    {...getRootProps()}
                    className={`
                      border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors
                      ${isDragActive 
                        ? 'border-primary bg-primary/5' 
                        : 'border-slate-300 hover:border-primary hover:bg-slate-50'
                      }
                      ${isUploading ? 'pointer-events-none opacity-50' : ''}
                    `}
                  >
                    <input {...getInputProps()} />
                    <Upload className="h-8 w-8 text-slate-400 mx-auto mb-3" />
                    {isUploading ? (
                      <div>
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto mb-2"></div>
                        <p className="text-sm text-slate-600">Uploading & Analyzing...</p>
                      </div>
                    ) : isDragActive ? (
                      <p className="text-sm text-slate-600">Drop files here...</p>
                    ) : (
                      <div>
                        <p className="text-sm text-slate-600 mb-1">
                          Drop files or{' '}
                          <button 
                            onClick={handleFileSelect}
                            className="text-primary hover:underline"
                          >
                            browse
                          </button>
                        </p>
                        <p className="text-xs text-slate-400">PDF, DOCX, TXT</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* File List */}
              {documents.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Documents</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {documents.map((doc) => (
                        <div
                          key={doc.id}
                          onClick={() => setSelectedDocument(doc)}
                          className={`
                            p-3 border rounded-lg cursor-pointer transition-colors
                            ${selectedDocument?.id === doc.id 
                              ? 'border-primary bg-primary/5' 
                              : 'border-slate-200 hover:border-slate-300'
                            }
                          `}
                        >
                          <div className="flex items-center space-x-3">
                            <div className="text-lg">{getFileIcon(doc.type)}</div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-medium text-slate-900 truncate text-sm">{doc.name}</h3>
                              <div className="flex items-center space-x-2">
                                <p className="text-xs text-slate-500">{formatFileSize(doc.size)}</p>
                                <Badge 
                                  variant={doc.status === 'ready' ? 'default' : doc.status === 'processing' ? 'secondary' : 'destructive'}
                                  className="text-xs"
                                >
                                  {doc.status}
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>

            {/* Analysis Results */}
            <div className="lg:col-span-3">
              {selectedDocument ? (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center">
                          <FileSearch className="h-5 w-5 mr-2 text-primary" />
                          {selectedDocument.name}
                        </CardTitle>
                        <CardDescription>AI Analysis Results</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button variant="outline" size="sm" onClick={() => window.location.href = '/dashboard/chat'}>
                          <Brain className="h-4 w-4 mr-2" />
                          Chat AI
                        </Button>
                        <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button>
                        <Button variant="outline" size="sm">
                          <Share className="h-4 w-4 mr-2" />
                          Share
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {selectedDocument.analysis ? (
                      <Tabs defaultValue="analysis" className="w-full">
                        <TabsList className="grid w-full grid-cols-3">
                          <TabsTrigger value="analysis">Analysis</TabsTrigger>
                          <TabsTrigger value="content">Content</TabsTrigger>
                          <TabsTrigger value="insights">Insights</TabsTrigger>
                        </TabsList>
                        
                        <TabsContent value="analysis" className="space-y-6">
                          {/* Quick Stats */}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                  <Clock className="h-4 w-4 text-blue-600" />
                                  <div>
                                    <p className="text-sm font-medium">{selectedDocument.analysis.readingTime} min</p>
                                    <p className="text-xs text-slate-500">Reading Time</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                  <FileText className="h-4 w-4 text-green-600" />
                                  <div>
                                    <p className="text-sm font-medium">{selectedDocument.analysis.wordCount}</p>
                                    <p className="text-xs text-slate-500">Words</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                  <BarChart3 className="h-4 w-4 text-purple-600" />
                                  <div>
                                    <Badge className={`text-xs ${getSentimentColor(selectedDocument.analysis.sentiment)}`}>
                                      {selectedDocument.analysis.sentiment}
                                    </Badge>
                                    <p className="text-xs text-slate-500">Sentiment</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                            
                            <Card>
                              <CardContent className="p-4">
                                <div className="flex items-center space-x-2">
                                  <Key className="h-4 w-4 text-orange-600" />
                                  <div>
                                    <p className="text-sm font-medium">{selectedDocument.analysis.topics.length}</p>
                                    <p className="text-xs text-slate-500">Topics</p>
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>

                          {/* Summary */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center">
                                <Brain className="h-5 w-5 mr-2 text-primary" />
                                AI Summary
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <p className="text-slate-700 leading-relaxed">
                                {selectedDocument.analysis.summary}
                              </p>
                            </CardContent>
                          </Card>

                          {/* Key Points */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg flex items-center">
                                <Key className="h-5 w-5 mr-2 text-primary" />
                                Key Points
                              </CardTitle>
                            </CardHeader>
                            <CardContent>
                              <ul className="space-y-2">
                                {selectedDocument.analysis.keyPoints.map((point, index) => (
                                  <li key={index} className="flex items-start space-x-2">
                                    <div className="h-2 w-2 bg-primary rounded-full mt-2 flex-shrink-0"></div>
                                    <span className="text-slate-700">{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </CardContent>
                          </Card>

                          {/* Topics */}
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Topics Identified</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="flex flex-wrap gap-2">
                                {selectedDocument.analysis.topics.map((topic, index) => (
                                  <Badge key={index} variant="secondary">
                                    {topic}
                                  </Badge>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </TabsContent>
                        
                        <TabsContent value="content">
                          <Card>
                            <CardHeader>
                              <CardTitle className="text-lg">Document Content</CardTitle>
                              <CardDescription>Extracted text from the document</CardDescription>
                            </CardHeader>
                            <CardContent>
                              <ScrollArea className="h-96 w-full border rounded-lg p-4">
                                <div className="prose prose-sm max-w-none">
                                  <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {selectedDocument.content}
                                  </p>
                                </div>
                              </ScrollArea>
                            </CardContent>
                          </Card>
                        </TabsContent>
                        
                        <TabsContent value="insights">
                          <div className="space-y-6">
                            <Card>
                              <CardHeader>
                                <CardTitle className="text-lg flex items-center">
                                  <Sparkles className="h-5 w-5 mr-2 text-primary" />
                                  AI Insights
                                </CardTitle>
                              </CardHeader>
                              <CardContent className="space-y-4">
                                <div>
                                  <h4 className="font-medium text-slate-900 mb-2">Document Structure</h4>
                                  <p className="text-sm text-slate-600">
                                    The document follows a well-organized structure with clear sections and logical flow.
                                  </p>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium text-slate-900 mb-2">Content Quality</h4>
                                  <div className="flex items-center space-x-2">
                                    <Progress value={85} className="flex-1" />
                                    <span className="text-sm text-slate-600">85%</span>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium text-slate-900 mb-2">Readability Score</h4>
                                  <div className="flex items-center space-x-2">
                                    <Progress value={78} className="flex-1" />
                                    <span className="text-sm text-slate-600">78%</span>
                                  </div>
                                </div>
                                
                                <div>
                                  <h4 className="font-medium text-slate-900 mb-2">Recommendations</h4>
                                  <ul className="text-sm text-slate-600 space-y-1">
                                    <li>• Consider adding more visual elements to improve engagement</li>
                                    <li>• Some sections could benefit from clearer headings</li>
                                    <li>• Overall structure is well-organized and professional</li>
                                  </ul>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        </TabsContent>
                      </Tabs>
                    ) : (
                      <div className="flex items-center justify-center h-48">
                        <div className="text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                          <p className="text-slate-600">Analyzing document...</p>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardContent className="flex items-center justify-center h-96">
                    <div className="text-center">
                      <FileSearch className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-900 mb-2">No Document Selected</h3>
                      <p className="text-slate-500 mb-4">Upload a document to start analyzing</p>
                      <Button onClick={handleFileSelect}>
                        <Upload className="h-4 w-4 mr-2" />
                        Upload Document
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </TabsContent>
        
        <TabsContent value="create" className="space-y-6">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Generate Documents</h2>
            <p className="text-slate-600">Choose a template to create professional documents with AI assistance</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {documentTemplates.map((template) => (
              <Card 
                key={template.id} 
                className="cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => handleTemplateSelect(template)}
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    {template.icon}
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 mb-4">{template.description}</p>
                  <div className="space-y-2">
                    <h4 className="font-medium text-slate-900 text-sm">Required Fields:</h4>
                    <div className="flex flex-wrap gap-1">
                      {template.fields.map((field, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {field}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <Button 
                    className="w-full mt-4" 
                    variant="outline"
                    onClick={() => window.location.href = `/dashboard/create?template=${template.id}`}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Document
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}