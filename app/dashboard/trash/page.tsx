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
  Code,
  RotateCcw,
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
  // Relations
  parent?: Item | null;
  children?: Item[];
  status?: "processing" | "ready" | "error";
  previewUrl?: string | null;
  preview?: string;
  analysis?: AnalysisResult;
}

export default function MyDocumentsPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Unified state management
  const [items, setItems] = useState<Item[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [showCreateFolderDialog, setShowCreateFolderDialog] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [showTemplateDialog, setShowTemplateDialog] = useState(false);

  // Load items using unified endpoint
  const loadItems = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch(
        `/api/items?parentId=${currentFolderId || ""}&deleted=true`
      );
      if (!response.ok) throw new Error("Failed to fetch items");
      const data = await response.json();
      setItems(data?.data);
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

  const restoreItem = useCallback(
    async (itemId: string) => {
      try {
        const response = await fetch(`/api/items/${itemId}/restore`, {
          method: "POST",
        });

        if (response.ok) {
          await loadItems();
        } else {
          console.error("Failed to restore item");
        }
      } catch (error) {
        console.error("Error restoring item:", error);
      }
    },
    [loadItems]
  );

  const deleteAll = useCallback(async () => {
    try {
      const response = await fetch(`/api/items/delete-all`, {
        method: "DELETE",
      });

      if (response.ok) {
        await loadItems();
      } else {
        console.error("Failed to delete all items");
      }
    } catch (error) {
      console.error("Error deleting all items:", error);
    }
  }, [loadItems]);

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

  // Navigate to folder
  const navigateToFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  return (
    <div className="flex h-screen">
      {/* Main content area */}
      <div className="bg-background min-h-screen flex-1">
        {isUploading && (
          <UploadingOverlay status={uploadStatus} error={uploadError} />
        )}
        {/* Header */}
        <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-20 flex items-center w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="font-semibold">Trash</h1>
                <p className="text-sm text-muted-foreground">
                  Items moved to trash are kept for 30 days before being
                  permanently deleted.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 relative h-[calc(100vh-80px)] overflow-auto">
          <div>
            <div className="flex justify-between items-center mb-6">
              <div className="text-lg font-semibold">
                Trash ( {filteredItems.length} )
              </div>
              {/* empty all */}

              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="outline" size={"sm"}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Empty All
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                    <AlertDialogDescription>
                      This action cannot be undone. This will permanently delete
                      all items in the trash.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => deleteAll()}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Yes
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
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
                        "relative rounded-lg p-4 cursor-pointer transition-all duration-300 group glass border-2 border-transparent hover:shadow-lg hover:border-primary/20",
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
                          <DropdownMenuSeparator />
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <DropdownMenuItem
                                onSelect={(e) => e.preventDefault()}
                              >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                Restore
                              </DropdownMenuItem>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  Are you sure?
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will
                                  restore the {item.type}.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => restoreItem(item.id)}
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
                          } else if (item.type === "table") {
                            router.push(
                              `/dashboard/documents/tables?id=${item.id}`
                            );
                          } else {
                            router.push(`/dashboard/documents/${item.id}`);
                          }
                        }}
                      >
                        {item.type === "folder" ? (
                          viewMode === "grid" ? (
                            <>
                              <Folder className="w-12 h-12 text-blue-600" />
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
          </div>
        </div>
      </div>
    </div>
  );
}
