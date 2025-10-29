import React, { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";
import { useState } from "react";

// Import Prism.js
import Prism from "prismjs";
import "prismjs/themes/prism.css";
import "prismjs/components/prism-javascript";
import "prismjs/components/prism-typescript";
import "prismjs/components/prism-python";
import "prismjs/components/prism-css";
import "prismjs/components/prism-json";
import "prismjs/components/prism-bash";

interface CodeBlockProps {
  children: string;
  className?: string;
  inline?: boolean;
}

const CodeBlock: React.FC<CodeBlockProps> = ({
  children,
  className,
  inline,
  ...props
}) => {
  const [copied, setCopied] = useState(false);
  const codeRef = useRef<HTMLElement>(null);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy text: ", err);
    }
  };

  useEffect(() => {
    if (codeRef.current && !inline) {
      Prism.highlightElement(codeRef.current);
    }
  }, [children, inline]);

  if (inline) {
    return (
      <code className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-sm font-mono">
        {children}
      </code>
    );
  }

  const match = /language-(\w+)/.exec(className || "");
  const language = match ? match[1] : "javascript";

  return (
    <div className="relative group">
      <div className="flex items-center justify-between bg-gray-100 border border-gray-200 px-4 py-2 rounded-t-lg">
        <span className="text-sm text-gray-700 font-mono">
          {language || "code"}
        </span>
        <Button
          variant="ghost"
          size="sm"
          onClick={copyToClipboard}
          className="h-8 w-8 p-0 text-gray-600 hover:text-gray-900 hover:bg-gray-200"
        >
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
        </Button>
      </div>
      <pre className="!rounded-b-lg !rounded-t-none !mt-0 !mb-0 bg-white border border-gray-200 overflow-x-auto">
        <code
          ref={codeRef}
          className={`language-${language}`}
          style={{
            display: "block",
            padding: "1rem",
            margin: 0,
          }}
        >
          {children}
        </code>
      </pre>
    </div>
  );
};

export { CodeBlock };
