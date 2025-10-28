"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useDropzone } from "react-dropzone";
import { useRouter, useSearchParams } from "next/navigation";
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
  Code,
  FlaskConical,
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
import CreateFolderDialog from "@/components/create-folder-dialog";
import TemplateSelectDialog from "@/components/template-select-dialog";
import UploadingOverlay from "@/components/uploading-overlay";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import ImagePreviewDialog from "@/components/image-preview-dialog";
import PdfPreviewDialog from "@/components/pdf-preview-dialog";

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
  type: "folder" | "document" | "table";
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
  const searchParams = useSearchParams();

  const currentFolderId = searchParams.get("folderId");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unified state management
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [isUploading, setIsUploading] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);
  const [imagePreviewOpen, setImagePreviewOpen] = useState(false);
  const [pdfPreviewOpen, setPdfPreviewOpen] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

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

        toast.success(`Successfully uploaded ${acceptedFiles.length} files`);
        setUploadStatus("success");
        await loadItems();

        // Auto-hide success message after 3 seconds
        setTimeout(() => {
          setUploadStatus("idle");
        }, 3000);
      } catch (error) {
        console.error("Upload error:", error);
        setUploadStatus("error");

        toast.error(error instanceof Error ? error.message : "Upload failed");

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
    // navigating searchparams folderId
    const params = new URLSearchParams(searchParams);
    params.set("folderId", folderId || "");
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex h-screen">
      {/* Main content area */}
      <div className="bg-white min-h-screen flex-1">
        {isUploading && (
          <UploadingOverlay status={uploadStatus} error={uploadError} />
        )}
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
              onClick={() => setShowTemplateDialog(true)}
            >
              <FileText size={20} />
              Document
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-3"
              onClick={() => router.push("/dashboard/documents/tables")}
            >
              <TableProperties size={20} />
              Table
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-3 relative"
            >
              <Presentation size={20} />
              Presentation
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-3"
              onClick={() => router.push("/dashboard/documents/labs")}
            >
              <FlaskConical size={20} />
              Labs
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
              className={cn(
                viewMode === "grid"
                  ? "grid grid-cols-1 gap-4 lg:grid-cols-6"
                  : "flex flex-col gap-2"
              )}
            >
              {isLoading ? (
                <>
                  {Array(12)
                    .fill("")
                    .map((_, index) => (
                      <div
                        className={cn(
                          "animate-pulse w-full bg-muted rounded-lg",
                          viewMode === "grid" ? "h-40" : "h-12"
                        )}
                        key={index}
                      ></div>
                    ))}
                </>
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
                      className={cn(
                        "relative rounded-lg p-4 cursor-pointer transition-all duration-200 group border-2",
                        item.type === "folder"
                          ? "bg-gray-50 hover:bg-blue-100 border-transparent hover:border-blue-200"
                          : "bg-gray-50 hover:bg-blue-100 border-transparent hover:border-gray-200",
                        viewMode === "grid"
                          ? "flex flex-col items-center justify-center space-y-2 min-h-40"
                          : "flex items-center justify-between"
                      )}
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
                                  {item.type === "folder"
                                    ? "This will move the folder and all its contents to the trash."
                                    : "This will move the document to the trash."}
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

                      <div
                        className={
                          viewMode === "grid"
                            ? "flex flex-col items-center justify-center"
                            : "flex items-center justify-between w-full"
                        }
                        onClick={() => {
                          if (item.type === "folder") {
                            navigateToFolder(item.id);
                            return;
                          }

                          const name = item.name || "";
                          const ext = (
                            name.split(".").pop() || ""
                          ).toLowerCase();
                          const mime = (item.fileType || "").toLowerCase();

                          const isExcel =
                            ["xlsx", "xls"].includes(ext) ||
                            mime ===
                              "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
                            mime === "application/vnd.ms-excel";
                          const isWord =
                            ["docx", "doc"].includes(ext) ||
                            mime ===
                              "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
                            mime === "application/msword";
                          const isImage =
                            [
                              "png",
                              "jpg",
                              "jpeg",
                              "webp",
                              "svg",
                              "gif",
                            ].includes(ext) || mime.startsWith("image/");
                          const isPdf =
                            ext === "pdf" || mime === "application/pdf";

                          if (isExcel || item.type === "table") {
                            router.push(
                              `/dashboard/documents/tables?id=${item.id}`
                            );
                            return;
                          }
                          if (isWord) {
                            router.push(
                              `/dashboard/documents/document?id=${item.id}`
                            );
                            return;
                          }
                          if (isImage) {
                            setPreviewUrl(item.url || null);
                            setPreviewTitle(name);
                            setImagePreviewOpen(true);
                            return;
                          }
                          if (isPdf) {
                            setPreviewUrl(item.url || null);
                            setPreviewTitle(name);
                            setPdfPreviewOpen(true);
                            return;
                          }
                          // router.push(`/dashboard/documents/document?id=${item.id}`);
                          // download file
                          fetch(item.url || "")
                            .then((res) => res.blob())
                            .then((blob) => {
                              const a = document.createElement("a");
                              a.href = URL.createObjectURL(blob);
                              a.download = name;
                              a.click();
                              URL.revokeObjectURL(a.href);
                            });
                        }}
                      >
                        {item.type === "folder" ? (
                          viewMode === "grid" ? (
                            <>
                              <Folder className="w-12 h-12 text-blue-600 fill-current" />
                              <div className="text-center text-sm text-slate-600 line-clamp-2">
                                {item.name}
                              </div>
                            </>
                          ) : (
                            <div className="flex items-center gap-3">
                              <Folder className="w-6 h-6 text-blue-600 fill-current" />
                              <div className="text-sm text-slate-700">
                                {item.name}
                              </div>
                            </div>
                          )
                        ) : viewMode === "grid" ? (
                          <>
                            <img
                              src={fileToIcon(
                                item.url?.split(".").pop() || "unknown"
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
                        ) : (
                          <>
                            <div className="flex items-center gap-3">
                              <img
                                src={fileToIcon(
                                  item.url?.split(".").pop() || "unknown"
                                )}
                                alt={item.name}
                                className="w-6"
                              />
                              <div>
                                <div className="text-sm text-slate-700 break-all hyphens-auto">
                                  {item.name}
                                </div>
                                <div className="text-xs text-slate-800 font-semibold">
                                  {fileSize(item.size || 0)}
                                </div>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                </>
              )}
            </div>
            {/* Preview Dialogs */}
            <ImagePreviewDialog
              open={imagePreviewOpen}
              onOpenChange={setImagePreviewOpen}
              url={previewUrl}
              title={previewTitle}
            />
            <PdfPreviewDialog
              open={pdfPreviewOpen}
              onOpenChange={setPdfPreviewOpen}
              url={previewUrl}
              title={previewTitle}
            />
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".ai,.avi,.bmp,.crd,.csv,.dll,.doc,.docx,.dwg,.eps,.exe,.flv,.gif,.html,.iso,.java,.jpg,.jpeg,.mdb,.mid,.mov,.mp3,.mp4,.mpeg,.pdf,.png,.ppt,.ps,.psd,.pub,.rar,.raw,.rss,.svg,.tiff,.txt,.wav,.wma,.xls,.xlsx,.xml,.xsl,.zip"
        multiple
        style={{ display: "none" }}
      />

      {/* Create Folder Dialog */}
      <CreateFolderDialog
        open={showCreateFolderDialog}
        onOpenChange={setShowCreateFolderDialog}
        newFolderName={newFolderName}
        setNewFolderName={(v: string) => setNewFolderName(v)}
        onCreate={createFolder}
        isLoading={isLoading}
      />

      {/* Template Select Dialog */}
      <TemplateSelectDialog
        open={showTemplateDialog}
        onOpenChange={setShowTemplateDialog}
        onSelect={(templateId: string | null) => {
          setShowTemplateDialog(false);
          if (!templateId) {
            router.push("/dashboard/documents/document?type=document");
          } else {
            router.push(
              `/dashboard/documents/document?type=document&template=${templateId}`
            );
          }
        }}
      />
    </div>
  );
}
