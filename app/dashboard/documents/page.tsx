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
  TableProperties,
  Presentation,
  FolderPlusIcon,
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

interface AnalysisResult {
  summary: string;
  keyPoints: string[];
  sentiment: "positive" | "neutral" | "negative";
  readingTime: number;
  wordCount: number;
  topics: string[];
}

interface Item {
  id: string;
  name: string;
  type: "folder" | "document";
  userId: string;
  parentId: string | null;
  createdAt: string;
  updatedAt: string;
  // Document-specific fields
  content?: string | null;
  fileType?: string | null;
  size?: number | null;
  url?: string | null;
  key?: string | null;
  bucket?: string | null;
  summary?: string | null;
  keyPoints?: string | null;
  sentiment?: string | null;
  topics?: string | null;
  // Relations
  parent?: Item | null;
  children?: Item[];
  status?: "processing" | "ready" | "error";
  preview?: string;
  analysis?: AnalysisResult;
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
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unified state management
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(
    null
  );
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Load items using unified endpoint
  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/items?parentId=${currentFolderId || ""}`
      );
      if (!response.ok) throw new Error("Failed to fetch items");
      const data = await response.json();
      setItems(data);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setIsLoading(false);
    }
  }, [currentFolderId]);

  // Filter items based on search term
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  useEffect(() => {
    loadItems();
  }, [loadItems]);

  const onDrop = useCallback(
    async (acceptedFiles: File[]) => {
      setIsUploading(true);
      setUploadStatus("uploading");
      setUploadError(null);

      try {
        for (const file of acceptedFiles) {
          // Step 1: Upload file to S3 via /api/upload
          const formData = new FormData();
          formData.append("file", file);

          const uploadResponse = await fetch("/api/upload", {
            method: "POST",
            body: formData,
          });

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload ${file.name}`);
          }

          const uploadResult = await uploadResponse.json();

          // Step 2: Create item record in database via /api/items
          const itemData = {
            name: file.name,
            type: "document",
            parentId: currentFolderId || null,
            fileType: file.type,
            size: file.size,
            url: uploadResult.file.url,
            key: uploadResult.file.key,
            bucket: uploadResult.file.bucket,
          };

          const itemResponse = await fetch("/api/items", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify(itemData),
          });

          if (!itemResponse.ok) {
            throw new Error(`Failed to create item record for ${file.name}`);
          }
        }

        setUploadStatus("success");
        await loadItems();

        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setUploadStatus("idle");
        }, 3000);
      } catch (error) {
        console.error("Upload error:", error);
        setUploadStatus("error");
        setUploadError(
          error instanceof Error ? error.message : "Upload failed"
        );

        // Auto-hide error message after 5 seconds
        setTimeout(() => {
          setUploadStatus("idle");
        }, 5000);
      } finally {
        setIsUploading(false);
      }
    },
    [currentFolderId, loadItems]
  );

  const deleteItem = useCallback(
    async (itemId: string) => {
      try {
        const response = await fetch(`/api/items/${itemId}`, {
          method: "DELETE",
        });

        if (response.ok) {
          setSelectedDocumentId((prev) => (prev === itemId ? null : prev));
          await loadItems();
        } else {
          console.error("Failed to delete item");
        }
      } catch (error) {
        console.error("Error deleting item:", error);
      }
    },
    [loadItems]
  );

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
    if (type?.includes("pdf")) return <FileText className="w-6 h-6" />;
    if (type?.includes("image")) return <FileImage className="w-6 h-6" />;
    if (type?.includes("spreadsheet"))
      return <FileSpreadsheet className="w-6 h-6" />;
    return <FileIcon className="w-6 h-6" />;
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment) {
      case "positive":
        return "text-green-600";
      case "negative":
        return "text-red-600";
      default:
        return "text-yellow-600";
    }
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    if (files.length > 0) {
      onDrop(files);
    }
  };

  // Create folder function
  const createFolder = async () => {
    if (!newFolderName.trim()) return;

    try {
      setIsLoading(true);
      const response = await fetch("/api/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: newFolderName.trim(),
          type: "folder",
          parentId: currentFolderId,
        }),
      });

      if (response.ok) {
        setNewFolderName("");
        setShowCreateFolderDialog(false);
        await loadItems();
      } else {
        console.error("Failed to create folder");
      }
    } catch (error) {
      console.error("Error creating folder:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Navigate to folder
  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  return (
    <div className="flex h-screen">
      {/* Upload status notification */}
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

      {/* Main content area */}
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
          {/* Search and filters */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Search documents..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-80"
                />
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === "grid" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("grid")}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === "list" ? "default" : "outline"}
                size="sm"
                onClick={() => setViewMode("list")}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap gap-4 mb-6">
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-3"
              onClick={handleFileSelect}
            >
              <UploadCloud size={20} />
              Upload
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-3"
              onClick={() => setShowCreateFolderDialog(true)}
            >
              <FolderPlusIcon size={20} />
              Folder
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-3"
              onClick={() => router.push('/dashboard/documents/create?type=document')}
            >
              <FileText size={20} />
              Document
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-3"
            >
              <TableProperties size={20} />
              Table
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-3"
            >
              <Presentation size={20} />
              Presentation
            </Button>
          </div>

          <div>
            <div className="mb-4 text-lg font-semibold">
              My Documents ( {filteredItems.length} )
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

            {/* Unified Items Grid */}
            <div
              className={twMerge(
                "grid grid-cols-1 gap-4",
                selectedDocumentId ? "lg:grid-cols-4" : "lg:grid-cols-6"
              )}
            >
              {isLoading ? (
                <div className="col-span-full text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                  <p className="text-muted-foreground mt-2">Loading...</p>
                </div>
              ) : filteredItems.length === 0 ? (
                <div className="col-span-full text-center py-12">
                  <FileSearch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-slate-900 mb-2">
                    No Items Found
                  </h3>
                  <p className="text-slate-500">
                    {searchTerm
                      ? "No folders or documents match your search."
                      : "Create your first folder or upload a document to get started."}
                  </p>
                </div>
              ) : (
                <>
                  {/* Unified rendering for both folders and documents */}
                  {filteredItems.map((item) => (
                    <div
                      key={`${item.type}-${item.id}`}
                      className={`relative flex flex-col items-center justify-center space-y-2 rounded-lg min-h-40 p-4 cursor-pointer transition-all duration-200 group border-2 ${
                        item.type === "folder"
                          ? "bg-gray-50 hover:bg-blue-100 border-transparent hover:border-blue-200"
                          : selectedDocumentId === item.id
                          ? "bg-blue-50 border-blue-200"
                          : "bg-gray-50 hover:bg-blue-100 border-transparent hover:border-gray-200"
                      }`}
                      onClick={() => {
                        if (item.type === "folder") {
                          navigateToFolder(item.id);
                        } else {
                          router.push(`/dashboard/documents/${item.id}`);
                        }
                      }}
                    >
                      {/* Dropdown menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          {item.type === "document" && (
                            <>
                              <DropdownMenuItem>
                                <Share className="w-4 h-4 mr-2" />
                                Share
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Download className="w-4 h-4 mr-2" />
                                Download
                              </DropdownMenuItem>
                            </>
                          )}
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
                                <AlertDialogTitle>
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  permanently delete the {item.type}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => deleteItem(item.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      {item.type === "folder" ? (
                        <>
                          <Folder className="w-12 h-12 text-blue-600" />
                          <div className="text-center text-sm text-slate-600 line-clamp-2">
                            {item.name}
                          </div>
                        </>
                      ) : (
                        <>
                          <img
                            src={fileToIcon(
                              item.fileType?.split("/").pop() || "unknown"
                            )}
                            alt={item.name}
                            className="w-12"
                          />
                          <div className="text-center text-sm text-slate-600 break-all hyphens-auto line-clamp-2">
                            {item.name}
                          </div>
                          <div className="text-center text-xs text-slate-800 font-semibold">
                            {fileSize(item.size || 0)}
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Document preview sidebar */}
      {selectedDocumentId && (
        <div className="w-[480px] border-l h-screen bg-white flex flex-col">
          <div className="p-4 border-b h-20 flex items-center w-full">
            <div className="flex items-center justify-between space-x-2 w-full">
              {selectedDocumentId ? (
                (() => {
                  const selectedDoc = items.find(
                    (item) =>
                      item.id === selectedDocumentId && item.type === "document"
                  );
                  return selectedDoc ? (
                    <>
                      <div className="flex items-center space-x-3">
                        <img
                          src={fileToIcon(
                            selectedDoc.fileType?.split("/").pop() || "unknown"
                          )}
                          alt={selectedDoc.name}
                          className="w-8"
                        />
                        <div>
                          <h3 className="font-medium text-sm line-clamp-1">
                            {selectedDoc.name}
                          </h3>
                          <p className="text-xs text-muted-foreground">
                            {fileSize(selectedDoc.size || 0)}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setSelectedDocumentId(null)}
                      >
                        ×
                      </Button>
                    </>
                  ) : null;
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
                  const selectedDoc = items.find(
                    (item) =>
                      item.id === selectedDocumentId && item.type === "document"
                  );
                  return selectedDoc ? (
                    <div className="space-y-6">
                      {/* Document preview */}
                      <div>
                        <h4 className="font-medium mb-2">Preview</h4>
                        <div className="bg-gray-50 rounded-lg p-4 min-h-[200px] flex items-center justify-center">
                          {selectedDoc.preview ? (
                            <img
                              src={selectedDoc.preview}
                              alt="Document preview"
                              className="max-w-full max-h-full object-contain"
                            />
                          ) : (
                            <div className="text-center text-gray-500">
                              <FileText className="w-12 h-12 mx-auto mb-2" />
                              <p>No preview available</p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Document analysis */}
                      {selectedDoc.analysis && (
                        <div>
                          <h4 className="font-medium mb-2">AI Analysis</h4>
                          <div className="space-y-4">
                            {/* Summary */}
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">
                                Summary
                              </h5>
                              <p className="text-sm text-gray-600">
                                {selectedDoc.analysis.summary}
                              </p>
                            </div>

                            {/* Key Points */}
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">
                                Key Points
                              </h5>
                              <ul className="text-sm text-gray-600 space-y-1">
                                {selectedDoc.analysis.keyPoints.map(
                                  (point, index) => (
                                    <li
                                      key={index}
                                      className="flex items-start"
                                    >
                                      <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 mr-2 flex-shrink-0"></span>
                                      {point}
                                    </li>
                                  )
                                )}
                              </ul>
                            </div>

                            {/* Sentiment */}
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">
                                Sentiment
                              </h5>
                              <Badge
                                className={getSentimentColor(
                                  selectedDoc.analysis.sentiment
                                )}
                              >
                                {selectedDoc.analysis.sentiment}
                              </Badge>
                            </div>

                            {/* Reading Time */}
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">
                                Reading Time
                              </h5>
                              <p className="text-sm text-gray-600">
                                {selectedDoc.analysis.readingTime} minutes
                              </p>
                            </div>

                            {/* Word Count */}
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">
                                Word Count
                              </h5>
                              <p className="text-sm text-gray-600">
                                {selectedDoc.analysis.wordCount} words
                              </p>
                            </div>

                            {/* Topics */}
                            <div>
                              <h5 className="text-sm font-medium text-gray-700 mb-1">
                                Topics
                              </h5>
                              <div className="flex flex-wrap gap-1">
                                {selectedDoc.analysis.topics.map(
                                  (topic, index) => (
                                    <Badge
                                      key={index}
                                      variant="secondary"
                                      className="text-xs"
                                    >
                                      {topic}
                                    </Badge>
                                  )
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null;
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

      {/* Create Folder Dialog */}
      <Dialog
        open={showCreateFolderDialog}
        onOpenChange={setShowCreateFolderDialog}
      >
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
              onClick={() => setShowCreateFolderDialog(false)}
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
