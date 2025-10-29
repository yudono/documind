"use client";

import React from "react";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

interface UploadingOverlayProps {
  status: "idle" | "uploading" | "success" | "error";
  error?: string | null;
}

export default function UploadingOverlay({ status, error }: UploadingOverlayProps) {
  const isUploading = status === "uploading";
  const isSuccess = status === "success";
  const isError = status === "error";

  return (
    <div className="fixed inset-0 z-[100] bg-gradient-to-br from-primary/20 via-background/40 to-secondary/20 backdrop-blur-sm flex items-center justify-center">
      <div className="glass rounded-2xl shadow-lg border-2 border-primary/20 p-6 w-[420px]">
        <div className="flex items-center gap-3">
          {isUploading && <Loader2 className="w-6 h-6 text-primary animate-spin" />}
          {isSuccess && <CheckCircle2 className="w-6 h-6 text-secondary" />}
          {isError && <XCircle className="w-6 h-6 text-red-600" />}
          <div className="flex-1">
            <div className="font-semibold font-display">
              {isUploading && "Uploading documents..."}
              {isSuccess && "Upload complete"}
              {isError && "Upload failed"}
            </div>
            <div className="text-sm text-muted-foreground">
              {isUploading && "Please wait while we process your files."}
              {isSuccess && "Files have been added to your library."}
              {isError && (error || "Something went wrong during upload.")}
            </div>
          </div>
        </div>
        {isUploading && (
          <div className="mt-4 w-full h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full w-1/2 bg-gradient-to-r from-primary to-secondary animate-[progress_1.2s_ease_infinite]" />
          </div>
        )}
        <style jsx>{`
          @keyframes progress {
            0% { transform: translateX(-50%); }
            50% { transform: translateX(20%); }
            100% { transform: translateX(100%); }
          }
        `}</style>
      </div>
    </div>
  );
}