"use client";

import React, {
  useEffect,
  useRef,
  forwardRef,
  useImperativeHandle,
  useState,
} from "react";
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
    const [isReady, setIsReady] = useState(false);

    useImperativeHandle(ref, () => ({
      export: (options?: SuperDocExportOptions) =>
        superdocRef.current?.export?.(options),
      setMode: (mode: string) =>
        (superdocRef.current as any)?.setDocumentMode?.(mode),
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
          setIsReady(true);
          onReady?.({
            export: (options?: SuperDocExportOptions) =>
              superdocRef.current?.export?.(options),
            setMode: (mode: string) =>
              (superdocRef.current as any)?.setDocumentMode?.(mode),
            getHTML: () => (superdocRef.current as any)?.getHTML?.(),
          });
        },
      });

      return () => {
        superdocRef.current = null;
        setIsReady(false);
      };
    }, [document, onReady]);

    return (
      <div className="w-full h-full flex flex-col items-center p-8">
        <div className="w-full h-full max-w-[850px] mx-auto px-6">
          {/* Toolbar container is provided at the page level */}
          {!isReady && (
            <div className="w-full mb-4 flex items-center justify-center text-muted-foreground">
              <div className="mr-2 h-4 w-4 border-2 border-muted-foreground/30 border-t-primary rounded-full animate-spin" />
              <span>Loading editor...</span>
            </div>
          )}
          <div id="superdoc-root" ref={containerRef} />
        </div>
      </div>
    );
  }
);

SuperDocEditor.displayName = "SuperDocEditor";

export default SuperDocEditor;
