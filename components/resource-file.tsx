"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { FileText, Download } from "lucide-react";

export type Resource = {
  name?: string;
  url?: string;
  type?: string;
  error?: string;
};

type ResourceFileProps = {
  resource: Resource;
  className?: string;
  withTooltip?: boolean;
  tooltipText?: string;
};

export default function ResourceFile({
  resource,
  className,
  withTooltip = true,
  tooltipText = "Download Document",
}: ResourceFileProps) {
  const handleDownload = async () => {
    if (!resource) return;

    if (resource.error) {
      alert(`Download failed: ${resource.error}`);
      return;
    }

    const url = resource.url || "";
    const name = resource.name || "document.pdf";

    try {
      // Data URL: trigger direct download
      if (url.startsWith("data:")) {
        const a = document.createElement("a");
        a.href = url;
        a.download = name;
        a.style.display = "none";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        return;
      }

      // Regular URL: fetch blob and download
      if (url && url !== "#") {
        const response = await fetch(url);
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = objectUrl;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(objectUrl);
        return;
      }

      // Fallback: mock document content
      const content = `Mock Document: ${resource.name ?? "document"}\nType: ${
        resource.type ?? ""
      }\nGenerated at: ${new Date().toISOString()}`;
      const blob = new Blob([content], { type: "text/plain" });
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = objectUrl;
      a.download = resource.name || "document.txt";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      console.error("Download failed:", error);
      alert("Download failed. The file may be too large or corrupted.");
    }
  };

  return (
    <div
      className={`mt-3 p-3 bg-background border rounded-lg ${className ?? ""}`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="font-medium text-sm">{resource?.name}</p>
          </div>
        </div>
        <div className="flex items-center space-x-2 ml-4">
          {withTooltip ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0"
                    onClick={handleDownload}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>{tooltipText}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <Button
              variant="outline"
              size="sm"
              className="h-8 w-8 p-0"
              onClick={handleDownload}
            >
              <Download className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
