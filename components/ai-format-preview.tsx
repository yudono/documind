"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Sparkles, FileText, Eye, Download, RefreshCw } from "lucide-react";

interface AIFormatPreviewProps {
  content: string;
  onFormatChange?: (formattedContent: string) => void;
}

export function AIFormatPreview({ content, onFormatChange }: AIFormatPreviewProps) {
  const [isFormatting, setIsFormatting] = useState(false);
  const [formattedContent, setFormattedContent] = useState("");
  const [formatType, setFormatType] = useState<"markdown" | "json" | "auto">("auto");

  const formatContent = async () => {
    setIsFormatting(true);
    try {
      const response = await fetch("/api/ai-document-format", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          action: "format",
          options: {
            outputFormat: "markdown",
            includeMetadata: true,
            enhanceStructure: true,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to format content");
      }

      const data = await response.json();
      const formatted = data.formattedContent || data.content;
      setFormattedContent(formatted);
      onFormatChange?.(formatted);
    } catch (error) {
      console.error("Formatting error:", error);
      setFormattedContent("Error formatting content. Please try again.");
    } finally {
      setIsFormatting(false);
    }
  };

  const parseContent = async (format: "markdown" | "json" | "auto") => {
    setIsFormatting(true);
    try {
      const response = await fetch("/api/ai-document-format", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content,
          action: "parse",
          format,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to parse content");
      }

      const data = await response.json();
      setFormattedContent(JSON.stringify(data.parsedDocument, null, 2));
    } catch (error) {
      console.error("Parsing error:", error);
      setFormattedContent("Error parsing content. Please try again.");
    } finally {
      setIsFormatting(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Sparkles className="h-5 w-5" />
          AI Document Format Preview
        </CardTitle>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={formatContent}
            disabled={isFormatting}
          >
            {isFormatting ? (
              <RefreshCw className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Sparkles className="h-4 w-4 mr-2" />
            )}
            Format with AI
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => parseContent("markdown")}
            disabled={isFormatting}
          >
            <FileText className="h-4 w-4 mr-2" />
            Parse Markdown
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => parseContent("json")}
            disabled={isFormatting}
          >
            <Eye className="h-4 w-4 mr-2" />
            Parse JSON
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => parseContent("auto")}
            disabled={isFormatting}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Auto-detect
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Badge variant="secondary" className="mb-2">
              Original Content
            </Badge>
            <ScrollArea className="h-64 w-full border rounded-md p-3">
              <pre className="text-sm whitespace-pre-wrap">{content}</pre>
            </ScrollArea>
          </div>
          <div>
            <Badge variant="secondary" className="mb-2">
              Formatted Content
            </Badge>
            <ScrollArea className="h-64 w-full border rounded-md p-3">
              {formattedContent ? (
                <pre className="text-sm whitespace-pre-wrap">{formattedContent}</pre>
              ) : (
                <div className="text-muted-foreground text-sm">
                  Click a format button to see the AI-processed content here.
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}