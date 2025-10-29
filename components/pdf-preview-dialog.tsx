"use client";

import React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type PdfPreviewDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  url?: string | null;
  title?: string;
};

export default function PdfPreviewDialog({ open, onOpenChange, url, title }: PdfPreviewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl glass">
        <DialogHeader>
          <DialogTitle className="font-display">{title || "PDF Preview"}</DialogTitle>
        </DialogHeader>
        <div className="w-full h-[75vh]">
          {url ? (
            <object data={url} type="application/pdf" className="w-full h-full">
              <iframe src={url} className="w-full h-full" />
            </object>
          ) : (
            <div className="text-sm text-muted-foreground">No PDF to display</div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}