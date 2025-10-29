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
import { Item } from "@/app/dashboard/documents/page";
import { Input } from "./ui/input";

interface TemplateSelectDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (templateId: string | null) => void;
  userId: string;
  parentId: string | null;
}

export default function TemplateSelectDialog({
  open,
  onOpenChange,
  onSelect,
  userId,
  parentId,
}: TemplateSelectDialogProps) {
  const blank: Item[] = [
    {
      id: null,
      name: "Blank",
      type: "document",
      isTemplate: true,
      url: null,
      parentId,
      userId,
    },
  ];
  const [items, setItems] = useState<Item[]>(blank);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [pagination, setPagination] = useState({
    total: 0,
    total_page: 0,
    page: 0,
    limit: 0,
  });
  const limit = 20;

  useEffect(() => {
    const fetchTemplates = async () => {
      if (!open) return;
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(
          `/api/items?isTemplate=true&page=${page}&limit=${
            page === 1 ? 19 : limit
          }&search=${search}`
        );
        if (!res.ok) throw new Error("Failed to load templates");
        const data = await res.json();
        if (data.pagination?.page === 1) {
          setItems([...blank, ...(data?.data || [])]);
        } else {
          setItems(data?.data || []);
        }
        setPagination({
          ...(data?.pagination || {}),
        });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load templates");
      } finally {
        setLoading(false);
      }
    };
    fetchTemplates();
  }, [open, search, page]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl">
        <DialogHeader>
          <DialogTitle className="font-display">Select a Template</DialogTitle>
          <DialogDescription>
            Choose a template to start from, or select Blank.
          </DialogDescription>
        </DialogHeader>

        {error && <div className="text-red-600 text-sm mb-2">{error}</div>}

        <div className="flex justify-end">
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search templates"
            className="w-80"
          />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-2 max-h-[calc(100vh-240px)] overflow-auto">
          {/* <div onClick={() => onSelect(null)} className=" cursor-pointer group">
            <div className="flex flex-col h-48 items-center justify-center border rounded-lg p-4 group-hover:border-2 group-hover:border-blue-500 rounded-lg">
              <File className="w-10 h-10 text-blue-600" />
            </div>
            <div className="mt-2 text-sm text-center">Blank</div>
          </div> */}
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
              {items.map((t) => (
                <div
                  key={t.id}
                  onClick={() => onSelect(t.id)}
                  className="cursor-pointer group"
                >
                  <div className="flex flex-col items-center justify-center h-48 rounded-xl glass border-2 hover:border-primary/20 transition-all duration-300 hover:shadow-lg">
                    {t.id ? (
                      <img
                        src={t?.previewUrl || "/placeholder.svg"}
                        alt={t.name}
                        className="w-full h-48 object-cover rounded-xl border"
                      />
                    ) : (
                      <File className="w-10 h-10 text-blue-600" />
                    )}
                  </div>
                  <span className="mt-2 text-xs line-clamp-2 text-center">
                    {t.name}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="mt-4 flex justify-between">
          <div>
            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span>
                Page {page} of {pagination.total_page}
              </span>
              <Button
                variant="outline"
                onClick={() => setPage(page + 1)}
                disabled={items.length < limit}
              >
                Next
              </Button>
            </div>
          </div>
          <Button
            variant="outline"
            className="glass"
            onClick={() => onOpenChange(false)}
          >
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
