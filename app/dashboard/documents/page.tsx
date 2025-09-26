"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
  PenTool,
  PlusIcon,
  UploadIcon,
  UploadCloud,
  ScrollText,
  WandSparkles,
  Grid,
  MoreVertical,
  Wand2,
  FileUp,
  MoreHorizontal,
  TrendingUp,
  Activity,
  Share2,
  Folder,
} from "lucide-react";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  BarChart,
  Bar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";
import fileToIcon from "@/lib/fileToIcon";
import fileSize from "@/lib/fileSize";
import { twMerge } from "tailwind-merge";

interface Document {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  createdAt: string;
  updatedAt: string;
  url?: string;
  key?: string;
  bucket?: string;
  folderId?: string | null;
  status: "processing" | "ready" | "error";
  preview?: string;
  content?: string;
  analysis?: AnalysisResult;
}

interface Folder {
  id: string;
  name: string;
  parentId: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  sentiment: "positive" | "neutral" | "negative";
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

interface Template {
  id: string;
  name: string;
  description: string;
  type: string;
  category: string;
  thumbnailUrl?: string;
  isPublic: boolean;
  downloadCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function MyDocumentsPage() {
  const router = useRouter();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [folders, setFolders] = useState<Folder[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedDocument, setSelectedDocument] = useState<Document | null>(
    null
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedTemplate, setSelectedTemplate] =
    useState<DocumentTemplate | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Load documents on component mount
  const loadDocuments = useCallback(async () => {
    try {
      setIsLoading(true);
      const url = currentFolderId
        ? `/api/documents?folderId=${currentFolderId}`
        : "/api/documents";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setDocuments(data);
      } else {
        console.error("Failed to load documents");
      }
    } catch (error) {
      console.error("Error loading documents:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId]);

  // Load folders
  const loadFolders = useCallback(async () => {
    try {
      const url = currentFolderId
        ? `/api/folders?parentId=${currentFolderId}`
        : "/api/folders";
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        setFolders(data);
      } else {
        console.error("Failed to load folders");
      }
    } catch (error) {
      console.error("Error loading folders:", error);
    }
  }, [currentFolderId]);

  // Load templates
  const loadTemplates = useCallback(async () => {
    try {
      const response = await fetch("/api/templates?limit=10");
      if (response.ok) {
        const data = await response.json();
        setTemplates(data.templates);
      } else {
        console.error("Failed to load templates");
      }
    } catch (error) {
      console.error("Error loading templates:", error);
    }
  }, []);

  // Load documents and folders on mount and when current folder changes
  useEffect(() => {
    loadDocuments();
    loadFolders();
    loadTemplates();
  }, [loadDocuments, loadFolders, loadTemplates]);

  const documentTemplates: DocumentTemplate[] = [
    {
      id: "1",
      name: "Invoice UMKM",
      description: "Template invoice untuk usaha kecil dan menengah",
      icon: <FileText className="h-8 w-8 text-blue-600" />,
      fields: [
        "Nama Pelanggan",
        "Nomor Invoice",
        "Tanggal",
        "Daftar Barang/Jasa",
        "Total Harga",
      ],
      category: "Keuangan",
    },
    {
      id: "2",
      name: "Surat Penawaran",
      description: "Template surat penawaran produk/jasa untuk calon klien",
      icon: <PenTool className="h-8 w-8 text-green-600" />,
      fields: ["Nama Perusahaan", "Produk/Jasa", "Harga", "Syarat & Ketentuan"],
      category: "Pemasaran",
    },
    {
      id: "3",
      name: "Laporan Keuangan Bulanan",
      description: "Template laporan keuangan sederhana untuk UMKM",
      icon: <BarChart3 className="h-8 w-8 text-purple-600" />,
      fields: ["Pendapatan", "Pengeluaran", "Laba Rugi", "Arus Kas"],
      category: "Keuangan",
    },
    {
      id: "4",
      name: "Kontrak Kerjasama",
      description:
        "Template kontrak kerjasama dengan supplier atau mitra bisnis",
      icon: <FileIcon className="h-8 w-8 text-orange-600" />,
      fields: [
        "Pihak Pertama",
        "Pihak Kedua",
        "Ruang Lingkup",
        "Syarat & Ketentuan",
      ],
      category: "Legal",
    },
    {
      id: "5",
      name: "Proposal Usaha",
      description: "Template proposal untuk pengajuan modal atau kerjasama",
      icon: <FileSpreadsheet className="h-8 w-8 text-indigo-600" />,
      fields: [
        "Ringkasan Eksekutif",
        "Analisis Pasar",
        "Proyeksi Keuangan",
        "Tim",
      ],
      category: "Bisnis",
    },
    {
      id: "6",
      name: "Surat Izin Usaha",
      description: "Template surat permohonan izin usaha ke instansi terkait",
      icon: <FileText className="h-8 w-8 text-red-600" />,
      fields: ["Data Pemohon", "Jenis Usaha", "Lokasi", "Dokumen Pendukung"],
      category: "Legal",
    },
  ];

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      if (acceptedFiles.length === 0) return;

      const file = acceptedFiles[0];
      setUploadStatus("uploading");
      setUploadError(null);

      try {
        // First, upload to S3
        const formData = new FormData();
        formData.append("file", file);

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
          folderId: currentFolderId,
        };

        const documentResponse = await fetch("/api/documents", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(documentData),
        });

        if (!documentResponse.ok) {
          throw new Error("Failed to save document metadata");
        }

        const newDocument = await documentResponse.json();

        // Add to documents list
        setDocuments((prev) => [newDocument, ...prev]);
        setUploadStatus("success");

        // Reset after 3 seconds
        setTimeout(() => {
          setUploadStatus("idle");
        }, 3000);
      } catch (error) {
        console.error("Upload error:", error);
        setUploadError(
          error instanceof Error ? error.message : "Upload failed"
        );
        setUploadStatus("error");

        // Reset error after 5 seconds
        setTimeout(() => {
          setUploadStatus("idle");
          setUploadError(null);
        }, 5000);
      }
    },
    [currentFolderId, loadDocuments]
  );

  // Delete document function
  const deleteDocument = useCallback(async (documentId: string) => {
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        // Remove from documents list
        setDocuments((prev) => prev.filter((doc) => doc.id !== documentId));

        // Clear selection if deleted document was selected
        setSelectedDocumentId((prev) => (prev === documentId ? null : prev));
      } else {
        console.error("Failed to delete document");
      }
    } catch (error) {
      console.error("Error deleting document:", error);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
    },
    multiple: true,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (type: string) => {
    if (type.includes("pdf")) return "📄";
    if (type.includes("word")) return "📝";
    if (type.includes("text")) return "📃";
    return "📁";
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600 bg-green-100";
      case "negative":
        return "text-red-600 bg-red-100";
      default:
        return "text-blue-600 bg-blue-100";
    }
  };

  const filteredDocuments = documents.filter((doc) =>
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
    console.log("Selected template:", template);
  };

  const [show, setShow] = useState(false);

  // Create folder function
  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      setIsCreatingFolder(true);
      const response = await fetch("/api/folders", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newFolderName,
          parentId: currentFolderId,
        }),
      });

      if (response.ok) {
        setNewFolderName("");
        loadFolders();
      } else {
        console.error("Failed to create folder");
      }
    } catch (error) {
      console.error("Error creating folder:", error);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Delete folder function
  const deleteFolder = async (folderId: string) => {
    try {
      const response = await fetch(`/api/folders/${folderId}`, {
        method: "DELETE",
      });

      if (response.ok) {
        loadFolders();
      } else {
        console.error("Failed to delete folder");
      }
    } catch (error) {
      console.error("Error deleting folder:", error);
    }
  };

  // Navigate to folder
  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  return (
    <div className="flex h-screen">
      {/* Upload Status Notification */}
      {(uploadStatus === "success" || uploadStatus === "error") && (
        <div
          className={`fixed top-4 right-4 z-50 p-4 rounded-lg shadow-lg transition-all duration-300 ${
            uploadStatus === "success"
              ? "bg-green-500 text-white"
              : "bg-red-500 text-white"
          }`}
        >
          <div className="flex items-center space-x-2">
            {uploadStatus === "success" ? (
              <>
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span>Document uploaded successfully!</span>
              </>
            ) : (
              <>
                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center">
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
                <span>{uploadError || "Upload failed"}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* Main Chat Area */}
      <div className="bg-white min-h-screen flex-1">
        {/* Header */}
        <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-20 flex items-center w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="font-semibold">My Documents</h1>
                <p className="text-sm text-muted-foreground">
                  Upload and manage your documents, analyze their content, and
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 relative h-[calc(100vh-80px)] overflow-auto">
          {/* scrollable horizontal badge/pills */}
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-muted-foreground">
              Template
            </h3>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/dashboard/templates")}
              className="text-xs"
            >
              Lihat Semua
            </Button>
          </div>
          <div
            className={twMerge(
              "overflow-x-auto mb-8",
              selectedDocumentId
                ? "max-w-[calc(100vw-800px)]"
                : "max-w-[calc(100vw-320px)]"
            )}
          >
            <div className="flex items-center space-x-3 pb-2">
              {templates.length > 0
                ? templates.map((template) => (
                    <div
                      key={template.id}
                      className="px-4 py-2 text-sm text-primary rounded-full border border-primary whitespace-nowrap cursor-pointer hover:bg-primary hover:text-primary-foreground transition-colors"
                      onClick={() =>
                        router.push(
                          `/dashboard/templates?template=${template.id}`
                        )
                      }
                    >
                      {template.name}
                    </div>
                  ))
                : // Fallback skeleton loaders while templates are loading
                  Array.from({ length: 4 }).map((_, index) => (
                    <div
                      key={index}
                      className="px-4 py-2 rounded-full border animate-pulse bg-gray-200 h-8 w-24"
                    />
                  ))}
            </div>
          </div>
          {/* Breadcrumb navigation */}
          {currentFolderId && (
            <div className="mb-4">
              <Button
                variant="ghost"
                onClick={() => navigateToFolder(null)}
                className="text-sm text-muted-foreground hover:text-foreground"
              >
                ← Back to root
              </Button>
            </div>
          )}

          {/* Folders */}
          {folders.length > 0 && (
            <div className="mb-6">
              <h3 className="text-sm font-medium text-muted-foreground mb-3">
                Folders
              </h3>
              <div
                className={twMerge(
                  "grid grid-cols-1 gap-4",
                  selectedDocumentId ? "lg:grid-cols-4" : "lg:grid-cols-6"
                )}
              >
                {folders.map((folder) => (
                  <div
                    key={folder.id}
                    className="relative flex flex-col items-center justify-center space-y-2 bg-blue-50 rounded-lg min-h-32 p-4 cursor-pointer transition-all duration-200 hover:bg-blue-100 group border-2 border-transparent hover:border-blue-200"
                    onClick={() => navigateToFolder(folder.id)}
                  >
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="absolute top-2 right-2 p-1 rounded-full bg-gray-200 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-300 z-10"
                          onClick={(e) => {
                            e.stopPropagation();
                          }}
                        >
                          <MoreHorizontal className="w-3 h-3" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Share2 className="w-4 h-4 mr-2" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem
                              className="text-red-600 focus:text-red-600"
                              onSelect={(e) => e.preventDefault()}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Folder</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{folder.name}"?
                                This action cannot be undone and will delete all
                                documents in this folder.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteFolder(folder.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>

                    <Folder className="w-12 h-12 text-blue-600" />
                    <div className="text-center text-sm text-slate-600 line-clamp-2">
                      {folder.name}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          <div
            className={twMerge(
              "grid grid-cols-1  gap-8",
              selectedDocumentId ? "lg:grid-cols-4" : "lg:grid-cols-6"
            )}
          >
            {isLoading ? (
              <div className="col-span-full text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-2">
                  Loading documents...
                </p>
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <FileSearch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-900 mb-2">
                  No Documents Found
                </h3>
                <p className="text-slate-500">
                  {searchTerm
                    ? "No documents match your search."
                    : "Upload your first document to get started."}
                </p>
              </div>
            ) : (
              filteredDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className={`relative flex flex-col items-center justify-center space-y-2 bg-slate-100 rounded-lg min-h-40 p-4 cursor-pointer transition-all duration-200 hover:bg-slate-200 group ${
                    selectedDocumentId === doc.id
                      ? "border-2 border-indigo-500 bg-indigo-50"
                      : "border-2 border-transparent"
                  }`}
                  onClick={() => setSelectedDocumentId(doc.id)}
                >
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <button
                        className="absolute top-2 right-2 p-1 rounded-full bg-gray-200 text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity duration-200 hover:bg-gray-300 z-10"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <MoreHorizontal className="w-3 h-3" />
                      </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <Share2 className="w-4 h-4 mr-2" />
                        Share
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={(e) => e.stopPropagation()}>
                        <Download className="w-4 h-4 mr-2" />
                        Download
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onSelect={(e) => e.preventDefault()}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Delete Document</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to delete "{doc.name}"? This
                              action cannot be undone.
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => deleteDocument(doc.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Delete
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    </DropdownMenuContent>
                  </DropdownMenu>

                  <img
                    src={fileToIcon(doc.type.split("/").pop() || "unknown")}
                    alt={doc.name}
                    className="w-12"
                  />
                  <div className="text-center text-sm text-slate-600 break-all hyphens-auto line-clamp-2 ">
                    {doc.name}
                  </div>
                  <div className="text-center text-xs text-slate-800 font-semibold">
                    {fileSize(doc.size)}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* {add document is floating} */}
          <div className="absolute bottom-8 right-8 flex flex-col items-end space-y-4">
            {/* Action Buttons with Staggered Animation */}
            <div
              className={`flex flex-col items-end space-y-3 transition-all duration-500 ease-out ${
                show
                  ? "opacity-100 translate-y-0 pointer-events-auto"
                  : "opacity-0 translate-y-8 pointer-events-none"
              }`}
            >
              {/* Generate Document Button */}
              <button
                onClick={() => router.push("/dashboard/chat")}
                className={`bg-emerald-500 hover:bg-emerald-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl flex items-center space-x-3 transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 ${
                  show ? "animate-slideInUp" : ""
                }`}
                style={{ animationDelay: show ? "0.1s" : "0s" }}
              >
                <Sparkles className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12" />
                <span className="font-medium">Generate Document</span>
              </button>

              {/* Summarize Document Button */}
              <button
                onClick={() => router.push("/dashboard/chat")}
                className={`bg-orange-500 hover:bg-orange-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl flex items-center space-x-3 transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 ${
                  show ? "animate-slideInUp" : ""
                }`}
                style={{ animationDelay: show ? "0.2s" : "0s" }}
              >
                <WandSparkles className="w-6 h-6 transition-transform duration-300 group-hover:rotate-12" />
                <span className="font-medium">Summarize Document</span>
              </button>

              {/* Upload Document Button */}
              <button
                onClick={handleFileSelect}
                disabled={uploadStatus === "uploading"}
                className={`bg-indigo-500 hover:bg-indigo-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl flex items-center space-x-3 transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none ${
                  show ? "animate-slideInUp" : ""
                }`}
                style={{ animationDelay: show ? "0.2s" : "0s" }}
              >
                {uploadStatus === "uploading" ? (
                  <>
                    <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span className="font-medium">Uploading...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-6 h-6 transition-transform duration-300 hover:-translate-y-1" />
                    <span className="font-medium">Upload Document</span>
                  </>
                )}
              </button>

              {/* add folder Button */}
              <button
                onClick={() => setIsCreatingFolder(true)}
                className={`bg-blue-500 hover:bg-blue-600 text-white p-4 rounded-full shadow-lg hover:shadow-xl flex items-center space-x-3 transition-all duration-300 ease-out transform hover:scale-105 active:scale-95 ${
                  show ? "animate-slideInUp" : ""
                }`}
                style={{ animationDelay: show ? "0.2s" : "0s" }}
              >
                <Folder className="w-6 h-6 transition-transform duration-300 hover:-translate-y-1" />
                <span className="font-medium">Add Folder</span>
              </button>
            </div>

            {/* Main Toggle Button */}
            <button
              className={`bg-primary hover:bg-primary/90 cursor-pointer text-white p-4 rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 ease-out transform hover:scale-110 active:scale-95 ${
                show ? "rotate-45" : "rotate-0"
              }`}
              onClick={() => setShow(!show)}
            >
              <Plus
                className={`w-8 h-8 transition-transform duration-300 ease-out ${
                  show ? "rotate-45" : "rotate-0"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Sidebar with Chat History */}
      {selectedDocumentId && (
        <div className="w-[480px] border-l h-screen bg-white flex flex-col">
          <div className="p-4 border-b h-20 flex items-center w-full">
            <div className="flex items-center justify-between space-x-2 w-full">
              {selectedDocumentId ? (
                (() => {
                  const selectedDoc = documents.find(
                    (doc: Document) => doc.id === selectedDocumentId
                  );
                  if (!selectedDoc) return <div>Document not found</div>;

                  return (
                    <div className="flex items-center space-x-3 w-full">
                      <img
                        src={fileToIcon(selectedDoc.type)}
                        alt={selectedDoc.name}
                        className="w-8 h-8"
                      />
                      <div className="flex-1 overflow-hidden">
                        <h3 className="font-semibold text-lg truncate">
                          {selectedDoc.name}
                        </h3>
                        <p className="text-sm text-slate-500">
                          {fileSize(selectedDoc.size)} •{" "}
                          {selectedDoc.uploadDate}
                        </p>
                      </div>
                      <MoreHorizontal className="w-6 h-6 text-slate-500" />
                    </div>
                  );
                })()
              ) : (
                <></>
              )}
            </div>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {selectedDocumentId ? (
                (() => {
                  const selectedDoc = documents.find(
                    (doc: Document) => doc.id === selectedDocumentId
                  );
                  if (!selectedDoc) return <div>Document not found</div>;

                  return (
                    <div className="space-y-6">
                      {/* Document Preview */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-900">Preview</h4>
                        <div className="border rounded-lg p-4 bg-slate-50 min-h-[200px] flex items-center justify-center">
                          {selectedDoc.type === "pdf" ? (
                            <div className="text-center space-y-2">
                              <FileText className="w-12 h-12 text-slate-400 mx-auto" />
                              <p className="text-sm text-slate-600">
                                PDF Preview
                              </p>
                              <p className="text-xs text-slate-500">
                                Click to view full document
                              </p>
                            </div>
                          ) : selectedDoc.type === "docx" ? (
                            <div className="text-center space-y-2">
                              <FileText className="w-12 h-12 text-blue-500 mx-auto" />
                              <p className="text-sm text-slate-600">
                                Word Document Preview
                              </p>
                              <p className="text-xs text-slate-500">
                                Click to view full document
                              </p>
                            </div>
                          ) : (
                            <div className="text-center space-y-2">
                              <FileIcon className="w-12 h-12 text-slate-400 mx-auto" />
                              <p className="text-sm text-slate-600">
                                Document Preview
                              </p>
                              <p className="text-xs text-slate-500">
                                Click to view full document
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* AI Analytics Section */}
                      <div className="space-y-4">
                        <h4 className="font-medium text-slate-900 flex items-center">
                          <Brain className="w-4 h-4 mr-2 text-indigo-600" />
                          AI Analytics
                        </h4>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-3">
                          <Card>
                            <CardContent className="p-3">
                              <div className="flex items-center space-x-2">
                                <Clock className="h-4 w-4 text-blue-600" />
                                <div>
                                  <p className="text-sm font-medium">5 min</p>
                                  <p className="text-xs text-slate-500">
                                    Reading Time
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          <Card>
                            <CardContent className="p-3">
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-green-600" />
                                <div>
                                  <p className="text-sm font-medium">1,250</p>
                                  <p className="text-xs text-slate-500">
                                    Words
                                  </p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Document Analytics Charts */}
                        <div className="space-y-4">
                          {/* Reading Progress Line Chart */}
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center">
                                <TrendingUp className="h-4 w-4 mr-2 text-blue-600" />
                                Reading Progress
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 w-[440px]">
                              <ChartContainer
                                config={{
                                  progress: {
                                    label: "Progress %",
                                    color: "hsl(var(--chart-1))",
                                  },
                                }}
                                className="h-[200px]"
                              >
                                <ResponsiveContainer width="100%" height="100%">
                                  <LineChart
                                    data={[
                                      { day: "Mon", progress: 20 },
                                      { day: "Tue", progress: 35 },
                                      { day: "Wed", progress: 50 },
                                      { day: "Thu", progress: 65 },
                                      { day: "Fri", progress: 80 },
                                      { day: "Sat", progress: 95 },
                                      { day: "Sun", progress: 100 },
                                    ]}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="day" />
                                    <YAxis />
                                    <ChartTooltip
                                      content={<ChartTooltipContent />}
                                    />
                                    <Line
                                      type="monotone"
                                      dataKey="progress"
                                      stroke="#3b82f6"
                                      strokeWidth={2}
                                      dot={{ fill: "#3b82f6" }}
                                    />
                                  </LineChart>
                                </ResponsiveContainer>
                              </ChartContainer>
                            </CardContent>
                          </Card>

                          {/* Document Statistics Bar Chart */}
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center">
                                <BarChart3 className="h-4 w-4 mr-2 text-green-600" />
                                Document Statistics
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 w-[440px]">
                              <ChartContainer
                                config={{
                                  count: {
                                    label: "Count",
                                    color: "hsl(var(--chart-2))",
                                  },
                                }}
                                className="h-[200px]"
                              >
                                <ResponsiveContainer width="100%" height="100%">
                                  <BarChart
                                    data={[
                                      { category: "Pages", count: 12 },
                                      { category: "Sections", count: 8 },
                                      { category: "Images", count: 5 },
                                      { category: "Tables", count: 3 },
                                      { category: "Charts", count: 2 },
                                    ]}
                                  >
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="category" />
                                    <YAxis />
                                    <ChartTooltip
                                      content={<ChartTooltipContent />}
                                    />
                                    <Bar
                                      dataKey="count"
                                      fill="#10b981"
                                      radius={[4, 4, 0, 0]}
                                    />
                                  </BarChart>
                                </ResponsiveContainer>
                              </ChartContainer>
                            </CardContent>
                          </Card>

                          {/* Document Complexity Radar Chart */}
                          <Card>
                            <CardHeader className="pb-3">
                              <CardTitle className="text-sm flex items-center">
                                <Activity className="h-4 w-4 mr-2 text-purple-600" />
                                Complexity Analysis
                              </CardTitle>
                            </CardHeader>
                            <CardContent className="pt-0 w-[440px]">
                              <ChartContainer
                                config={{
                                  score: {
                                    label: "Score",
                                    color: "hsl(var(--chart-3))",
                                  },
                                }}
                                className="h-[250px]"
                              >
                                <ResponsiveContainer width="100%" height="100%">
                                  <RadarChart
                                    data={[
                                      { metric: "Readability", score: 85 },
                                      { metric: "Technical", score: 70 },
                                      { metric: "Structure", score: 90 },
                                      { metric: "Clarity", score: 80 },
                                      { metric: "Completeness", score: 95 },
                                      { metric: "Engagement", score: 75 },
                                    ]}
                                  >
                                    <PolarGrid />
                                    <PolarAngleAxis dataKey="metric" />
                                    <PolarRadiusAxis
                                      angle={90}
                                      domain={[0, 100]}
                                    />
                                    <Radar
                                      name="Score"
                                      dataKey="score"
                                      stroke="#8b5cf6"
                                      fill="#8b5cf6"
                                      fillOpacity={0.3}
                                      strokeWidth={2}
                                    />
                                    <ChartTooltip
                                      content={<ChartTooltipContent />}
                                    />
                                  </RadarChart>
                                </ResponsiveContainer>
                              </ChartContainer>
                            </CardContent>
                          </Card>
                        </div>

                        {/* AI Summary */}
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center">
                              <Sparkles className="h-4 w-4 mr-2 text-indigo-600" />
                              AI Summary
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <p className="text-sm text-slate-700 leading-relaxed">
                              This document appears to be a business proposal
                              containing key information about partnership
                              opportunities, financial projections, and
                              strategic objectives for the upcoming quarter.
                            </p>
                          </CardContent>
                        </Card>

                        {/* Key Points */}
                        <Card>
                          <CardHeader className="pb-3">
                            <CardTitle className="text-sm flex items-center">
                              <Key className="h-4 w-4 mr-2 text-orange-600" />
                              Key Points
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <ul className="space-y-2">
                              <li className="flex items-start space-x-2">
                                <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-slate-700">
                                  Partnership agreement terms and conditions
                                </span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-slate-700">
                                  Financial projections for Q1 2024
                                </span>
                              </li>
                              <li className="flex items-start space-x-2">
                                <div className="h-1.5 w-1.5 bg-indigo-600 rounded-full mt-2 flex-shrink-0"></div>
                                <span className="text-sm text-slate-700">
                                  Strategic objectives and milestones
                                </span>
                              </li>
                            </ul>
                          </CardContent>
                        </Card>

                        {/* Action Buttons */}
                        <div className="flex space-x-2">
                          <Button
                            className="flex-1"
                            onClick={() =>
                              (window.location.href = "/dashboard/chat")
                            }
                          >
                            <Brain className="h-4 w-4 mr-2" />
                            Chat with AI
                          </Button>
                          {/* <Button variant="outline" size="sm">
                          <Download className="h-4 w-4 mr-2" />
                          Export
                        </Button> */}
                          <Button variant="outline" size="sm">
                            <Share2 className="h-4 w-4 mr-2" />
                            Share
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="text-center py-12">
                  <FileSearch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    Select a Document
                  </h3>
                  <p className="text-slate-500">
                    Choose a document from the grid to view its preview and AI
                    analysis
                  </p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      )}

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".pdf,.docx,.txt"
        multiple
        style={{ display: "none" }}
      />

      {/* Folder Creation Dialog */}
      <Dialog open={isCreatingFolder} onOpenChange={setIsCreatingFolder}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Folder</DialogTitle>
            <DialogDescription>
              Enter a name for your new folder.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Folder name"
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  createFolder();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCreatingFolder(false)}
            >
              Cancel
            </Button>
            <Button onClick={createFolder} disabled={!newFolderName.trim()}>
              Create Folder
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
