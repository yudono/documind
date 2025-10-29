"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type ImagePreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url?: string | null;
  title?: string;
};

export default function ImagePreviewDialog({ open, onOpenChange, url, title }: ImagePreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl glass">
        <DialogHeader>
          <DialogTitle className="font-display">{title || "Image Preview"}</DialogTitle>
        </DialogHeader>
        <div className="w-full h-[70vh] flex items-center justify-center glass rounded-xl">
          {url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={title || "Preview"} className="max-w-full max-h-full object-contain" />
          ) : (
            <div className="text-sm text-muted-foreground">No image to display</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}