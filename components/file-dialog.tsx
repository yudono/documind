"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileUpload } from "@/components/ui/file-upload";
import { File, FileSearch, Folder, X } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import fileToIcon from "@/lib/fileToIcon";
import fileSize from "@/lib/fileSize";
import { Input } from "./ui/input";

interface DocumentItem {
  id: string;
  name: string;
  type: "document" | "folder" | string;
  fileType?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  url?: string | null;
  size?: number | null;
}

interface FilesDocumentsDialogProps {
  documents: DocumentItem[]; // optional initial docs
  selectedDocuments: DocumentItem[];
  onSubmit?: (urls: string[], docs: DocumentItem[]) => void;
}

export function FilesDocumentsDialog({
  documents,
  selectedDocuments,
  onSubmit,
}: FilesDocumentsDialogProps) {
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [items, setItems] = useState<DocumentItem[]>(documents || []);
  const [selected, setSelected] = useState<DocumentItem[]>(
    selectedDocuments || []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);

  const loadItems = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/items${currentFolderId ? `?parentId=${currentFolderId}` : ""}`
      );
      if (!response.ok) throw new Error("Failed to fetch items");
      const data = await response.json();
      setItems(data || []);
    } catch (error) {
      console.error("Error loading items:", error);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    loadItems();
  }, [currentFolderId]);

  const toggleSelect = (doc: DocumentItem) => {
    if (doc.type === "folder") {
      setCurrentFolderId(doc.id);
    } else {
      setSelected((prev) => {
        const exists = prev.some((d) => d.id === doc.id);
        if (exists) {
          return prev.filter((d) => d.id !== doc.id);
        } else {
          return [...prev, doc];
        }
      });
    }
  };

  const formatDate = (date?: string | Date | null) => {
    if (!date) return "";
    const d = typeof date === "string" ? new Date(date) : date;
    const time = d instanceof Date ? d.getTime() : NaN;
    return isNaN(time) ? "" : d.toLocaleDateString();
  };

  const handleSubmit = () => {
    const urls = selected
      .map((doc) => (doc.url ? String(doc.url) : ""))
      .filter((u) => !!u);
    if (onSubmit) {
      onSubmit(urls, selected);
    }
  };

  // Filter items based on search term
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const removeSelect = (doc: DocumentItem) => {
    setSelected((prev) => prev.filter((d) => d.id !== doc.id));
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <File className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Files & Documents</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="select" className="w-full">
          <div className="flex justify-between">
            <TabsList className="grid w-full grid-cols-2 w-80">
              <TabsTrigger value="upload">Upload Files</TabsTrigger>
              <TabsTrigger value="select">Select Documents</TabsTrigger>
            </TabsList>
            <Input
              placeholder="Search documents..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-80"
            />
          </div>

          <TabsContent value="upload" className="space-y-4">
            <FileUpload
              onFileUpload={async (file, result) => {
                try {
                  const itemData = {
                    name: file.name,
                    type: "document",
                    parentId: null,
                    fileType: file.type,
                    size: file.size,
                    url: result?.file?.url,
                    key: result?.file?.key,
                    bucket: result?.file?.bucket,
                  };

                  const itemResponse = await fetch("/api/items", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(itemData),
                  });

                  if (!itemResponse.ok) {
                    console.error(
                      "Failed to create item record for",
                      file.name
                    );
                  }

                  loadItems();
                } catch (err) {
                  console.error("Upload record error:", err);
                }
              }}
              onAllUploadsComplete={async () => {
                try {
                  const response = await fetch(`/api/items?parentId=`);
                  if (response.ok) {
                    const data = await response.json();
                    setItems(
                      (Array.isArray(data) ? data : []).filter(
                        (i: any) => i.type === "document"
                      )
                    );
                  }
                } catch (err) {
                  console.error("Error refreshing items:", err);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="select" className="space-y-4">
            {/* Explorer-style grid */}
            <div className="max-h-[calc(100vh-200px)] overflow-y-auto">
              {/* Breadcrumb navigation */}
              {currentFolderId && (
                <div className="mb-4">
                  <Button
                    variant="ghost"
                    onClick={() => setCurrentFolderId(null)}
                    className="text-sm text-muted-foreground hover:text-foreground"
                  >
                    ← Back to root
                  </Button>
                </div>
              )}

              {
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-6">
                  {loading ? (
                    <>
                      {Array(12)
                        .fill("")
                        .map((_, index) => (
                          <div
                            className={cn(
                              "animate-pulse w-full bg-muted rounded-lg h-40"
                            )}
                            key={index}
                          ></div>
                        ))}
                    </>
                  ) : (
                    <>
                      {filteredItems.length === 0 ? (
                        <div className="col-span-full text-center py-12">
                          <FileSearch className="w-12 h-12 text-slate-300 mx-auto mb-4" />
                          <h3 className="text-lg font-medium text-slate-900 mb-2">
                            No Items Found
                          </h3>
                          <p className="text-slate-500">
                            Upload your first document to get started.
                          </p>
                        </div>
                      ) : (
                        filteredItems.map((doc) => {
                          const isSelected = selected.some(
                            (d) => d.id === doc.id
                          );
                          const ext = doc.url?.split(".").pop() || "unknown";
                          return (
                            <div
                              key={doc.id}
                              className={cn(
                                "relative rounded-lg p-4 cursor-pointer transition-all duration-200 group border-2 bg-gray-50 hover:bg-blue-100 border-transparent hover:border-gray-200 flex items-center justify-center",
                                isSelected && "border-primary bg-primary/10"
                              )}
                              onClick={() => toggleSelect(doc)}
                            >
                              <div className="flex flex-col items-center justify-center space-y-2 min-h-40">
                                {doc.type === "folder" ? (
                                  <>
                                    <Folder className="w-12 h-12 text-blue-600 fill-current" />
                                    <div className="text-center text-sm text-slate-600 line-clamp-2">
                                      {doc.name}
                                    </div>
                                  </>
                                ) : (
                                  <>
                                    <img
                                      src={fileToIcon(ext)}
                                      alt={doc.name}
                                      className="w-12"
                                    />
                                    <div className="text-center text-sm text-slate-600 break-all hyphens-auto line-clamp-2">
                                      {doc.name}
                                    </div>
                                    <div className="text-center text-xs text-muted-foreground">
                                      <div className="text-xs text-slate-800 font-semibold">
                                        {fileSize(doc.size || 0)}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </>
                  )}
                </div>
              }
            </div>

            {selected.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Selected: {selected.length} document(s)
                </p>
                <div className="flex flex-wrap gap-1">
                  {selected.map((doc) => (
                    <Badge key={doc.id} variant="secondary" className="text-xs">
                      {doc.name}{" "}
                      <X
                        size={12}
                        className="ml-2 cursor-pointer"
                        onClick={() => removeSelect(doc)}
                      />
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-2 mt-4">
          <DialogClose asChild>
            <Button variant="outline" size="sm">
              Cancel
            </Button>
          </DialogClose>
          <DialogClose asChild>
            <Button
              size="sm"
              disabled={selected.length === 0}
              onClick={handleSubmit}
            >
              Submit
            </Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}
