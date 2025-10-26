"use client";

import React, { useState, useRef, useEffect } from "react";
import { Card, CardContent, CardHeader } from "./ui/card";
import ResourceFile from "./resource-file";
import { CodeBlock } from "@/components/ui/code-block";
import { Button } from "./ui/button";
import { Edit, Save, X } from "lucide-react";

// Import Prism.js for syntax highlighting in edit mode
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";

export type CodeVisualProps = {
  language?: string;
  code: string;
  className?: string;
  onCodeChange?: (newCode: string) => void;
  linkedResource?: {
    name?: string;
    url?: string;
    type?: string;
    error?: string;
  }[];
};

export default function CodeVisual({
  language,
  code,
  className,
  onCodeChange,
  linkedResource,
}: CodeVisualProps) {
  const [editedCode, setEditedCode] = useState(code);
  const [isFocused, setIsFocused] = useState(false);
  const editableRef = useRef<HTMLElement | null>(null);

  // Keep local state in sync when parent updates code
  useEffect(() => {
    setEditedCode(code);
  }, [code]);

  // Re-run Prism highlighting when content or language changes
  useEffect(() => {
    // Avoid re-highlighting while user is actively typing to preserve caret
    if (!editableRef.current) return;
    Prism.highlightElement(editableRef.current);
  }, [language, isFocused]);

  const handleKeyDown: React.KeyboardEventHandler<HTMLElement> = (e) => {
    // Allow Tab key for indentation
    if (e.key === "Tab") {
      e.preventDefault();
      const selection = window.getSelection();
      if (!selection || selection.rangeCount === 0) return;
      const range = selection.getRangeAt(0);
      const tabNode = document.createTextNode("  "); // 2 spaces
      range.insertNode(tabNode);
      range.setStartAfter(tabNode);
      range.setEndAfter(tabNode);
      selection.removeAllRanges();
      selection.addRange(range);
    }
  };

  return (
    <Card className={className}>
      <CardHeader className="border-b">
        <div className="flex items-center justify-between">
          <div className="text-lg font-semibold">Code</div>
        </div>
        <div className="bg-neutral-100 p-4 rounded-lg">
          <div className="text-sm font-semibold text-neutral-500">
            Linked Documents
          </div>
          <div className="flex flex-wrap">
            {linkedResource &&
              linkedResource.length > 0 &&
              linkedResource.map((resource, idx) => (
                <ResourceFile
                  key={idx}
                  resource={resource}
                  withTooltip
                  tooltipText="Download Document"
                />
              ))}
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Always-editable Prism-highlighted code block */}
        <div className="relative group">
          <div className="flex items-center justify-between bg-gray-100 border border-gray-200 px-4 py-2 rounded-t-lg">
            <span className="text-sm text-gray-700 font-mono">
              {language || "javascript"} (editing)
            </span>
          </div>
          <pre className="!rounded-b-lg !rounded-t-none !mt-0 !mb-0 bg-white border border-gray-200 overflow-x-auto">
            <code
              ref={editableRef}
              className={`language-${language || "javascript"}`}
              contentEditable
              suppressContentEditableWarning
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => {
                setIsFocused(false);
                if (editableRef.current) {
                  Prism.highlightElement(editableRef.current);
                }
              }}
              spellCheck={false}
              style={{
                display: "block",
                padding: "1rem",
                margin: 0,
                minHeight: "200px",
                outline: "none",
                whiteSpace: "pre-wrap",
                wordBreak: "break-word",
                direction: "ltr",
                unicodeBidi: "plaintext",
              }}
            >
              {editedCode}
            </code>
          </pre>
        </div>
      </CardContent>
    </Card>
  );
}
