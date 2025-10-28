"use client";

import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { File, Grid3X3 } from "lucide-react";

interface Template {
  id: string;
  name: string;
  thumbnail?: string | null;
}

interface TemplateSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (templateId: string | null) => void;
}

export default function TemplateSelectDialog({
  open,
  onOpenChange,
  onSelect,
}: TemplateSelectDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!open) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/templates");
        if (!res.ok) throw new Error("Failed to load templates");
        const data = await res.json();
        setTemplates(data.templates || []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load templates");
      } finally {
        setLoading(false);
      }
    };
    // fetchTemplates();
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle>Select a Template</DialogTitle>
          <DialogDescription>
            Choose a template to start from, or select Blank.
          </DialogDescription>
        </DialogHeader>

        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 max-h-[calc(100vh-200px)] overflow-auto">
          <div onClick={() => onSelect(null)} className=" cursor-pointer group">
            <div className="flex flex-col h-48 items-center justify-center border rounded-lg p-4 group-hover:border-2 group-hover:border-blue-500 rounded-lg">
              <File className="w-10 h-10 text-blue-600" />
            </div>
            <div className="mt-2 text-sm text-center">Blank</div>
          </div>
          {/* Templates */}
          {loading ? (
            Array(8)
              .fill(null)
              .map((_, i) => (
                <div
                  key={i}
                  className="animate-pulse h-48 border rounded-lg bg-muted"
                />
              ))
          ) : (
            <>
              {/* Blank template tile (top-left) */}
              {templates.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelect(t.id)}
                  className="cursor-pointer group"
                >
                  <div className="flex flex-col items-center justify-center rounded-lg group-hover:border-2 group-hover:border-blue-500 rounded-lg">
                    <img
                      src={t?.thumbnail || "/placeholder.svg"}
                      alt={t.name}
                      className="w-full h-48 object-cover rounded border"
                    />
                  </div>
                  <span className="mt-2 text-xs line-clamp-2 text-center">
                    {t.name}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="mt-4 flex justify-end">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
