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
import { File } from "lucide-react";

interface DocumentItem {
  id: string;
  name: string;
  type: "document" | "folder" | string;
  fileType?: string | null;
  createdAt?: string | null;
  updatedAt?: string | null;
  url?: string | null;
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
  const [items, setItems] = useState<DocumentItem[]>(documents || []);
  const [selected, setSelected] = useState<DocumentItem[]>(selectedDocuments || []);

  useEffect(() => {
    const loadItems = async () => {
      try {
        const response = await fetch(`/api/items?parentId=`);
        if (!response.ok) throw new Error("Failed to fetch items");
        const data = await response.json();
        setItems((Array.isArray(data) ? data : []).filter((i: any) => i.type === "document"));
      } catch (error) {
        console.error("Error loading items:", error);
      }
    };
    loadItems();
  }, []);

  const toggleSelect = (doc: DocumentItem) => {
    setSelected((prev) => {
      const exists = prev.some((d) => d.id === doc.id);
      if (exists) {
        return prev.filter((d) => d.id !== doc.id);
      } else {
        return [...prev, doc];
      }
    });
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

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <File className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Files & Documents</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="select" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="upload">Upload Files</TabsTrigger>
            <TabsTrigger value="select">Select Documents</TabsTrigger>
          </TabsList>

          <TabsContent value="upload" className="space-y-4">
            <FileUpload
              multiple={true}
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
                    console.error("Failed to create item record for", file.name);
                  }
                } catch (err) {
                  console.error("Upload record error:", err);
                }
              }}
              onAllUploadsComplete={async () => {
                try {
                  const response = await fetch(`/api/items?parentId=`);
                  if (response.ok) {
                    const data = await response.json();
                    setItems((Array.isArray(data) ? data : []).filter((i: any) => i.type === "document"));
                  }
                } catch (err) {
                  console.error("Error refreshing items:", err);
                }
              }}
            />
          </TabsContent>

          <TabsContent value="select" className="space-y-4">
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {items.map((doc) => (
                <div
                  key={doc.id}
                  className={`flex items-center space-x-3 p-3 rounded-lg cursor-pointer transition-colors ${
                    selected.some((d) => d.id === doc.id)
                      ? "bg-primary/10 border border-primary"
                      : "hover:bg-muted"
                  }`}
                  onClick={() => toggleSelect(doc)}
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {(doc.fileType || doc.type)} • {formatDate(doc?.updatedAt || doc?.createdAt)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            {selected.length > 0 && (
              <div className="pt-2 border-t">
                <p className="text-sm text-muted-foreground mb-2">
                  Selected: {selected.length} document(s)
                </p>
                <div className="flex flex-wrap gap-1">
                  {selected.map((doc) => (
                    <Badge key={doc.id} variant="secondary" className="text-xs">
                      {doc.name}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>
        <div className="flex justify-end gap-2 mt-4">
          <DialogClose asChild>
            <Button variant="outline" size="sm">Cancel</Button>
          </DialogClose>
          <DialogClose asChild>
            <Button size="sm" disabled={selected.length === 0} onClick={handleSubmit}>Submit</Button>
          </DialogClose>
        </div>
      </DialogContent>
    </Dialog>
  );
}