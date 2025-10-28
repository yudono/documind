"use client";

import React, { useEffect, useRef, forwardRef, useImperativeHandle } from "react";
import { SuperDoc, SuperDocExportOptions } from "@harbour-enterprises/superdoc";
import "@harbour-enterprises/superdoc/style.css";

export type SuperDocEditorRef = {
  export?: (options?: SuperDocExportOptions) => Promise<unknown> | unknown;
  setMode?: (mode: string) => void;
  getHTML?: () => string | undefined;
};

type SuperDocEditorProps = {
  document?: string;
  onReady?: (api: SuperDocEditorRef) => void;
};

const SuperDocEditor = forwardRef<SuperDocEditorRef, SuperDocEditorProps>(
  ({ document, onReady }, ref) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const superdocRef = useRef<SuperDoc | null>(null);

    useImperativeHandle(ref, () => ({
      export: (options?: SuperDocExportOptions) => superdocRef.current?.export?.(options),
      setMode: (mode: string) => (superdocRef.current as any)?.setDocumentMode?.(mode),
      getHTML: () => (superdocRef.current as any)?.getHTML?.(),
    }));

    useEffect(() => {
      if (!containerRef.current) return;

      superdocRef.current = new SuperDoc({
        selector: containerRef.current,
        document,
        toolbar: "#superdoc-toolbar",
        role: "editor", // User CAN edit
        documentMode: "editing",
        onReady: () => {
          onReady?.({
            export: (options?: SuperDocExportOptions) => superdocRef.current?.export?.(options),
            setMode: (mode: string) => (superdocRef.current as any)?.setDocumentMode?.(mode),
            getHTML: () => (superdocRef.current as any)?.getHTML?.(),
          });
        },
      });

      return () => {
        superdocRef.current = null;
      };
    }, [document, onReady]);

    return (
      <div className="w-full h-full flex flex-col items-center p-8">
        <div className="w-full h-full max-w-[850px] mx-auto px-6">
          {/* Toolbar container is provided at the page level */}
          <div id="superdoc-root" ref={containerRef} />
        </div>
      </div>
    );
  }
);

SuperDocEditor.displayName = "SuperDocEditor";

export default SuperDocEditor;
