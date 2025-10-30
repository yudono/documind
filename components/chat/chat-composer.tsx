"use client";

import React, { Dispatch, SetStateAction, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { File, X, Mic, Square, Send } from "lucide-react";
import { DocumentItem, FilesDocumentsDialog } from "../file-dialog";

type ChatComposerProps = {
  items: DocumentItem[];
  setItems: Dispatch<SetStateAction<DocumentItem[]>>;
  toggleDocumentSelection: (doc: any) => void;
  textareaRef: React.RefObject<HTMLTextAreaElement>;
  input: string;
  setInput: (v: string) => void;
  handleKeyPress: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  isLoading: boolean;
  isRecording: boolean;
  toggleRecording: () => void;
  supportsSpeech: boolean;
  sendMessage: () => void;
  setSelectedreferencedDocs: Dispatch<
    SetStateAction<
      {
        name: string;
        url: string;
      }[]
    >
  >;
  note?: boolean;
  filePicker?: boolean;
};

export default function ChatComposer({
  items,
  setItems,
  toggleDocumentSelection,
  textareaRef,
  input,
  setInput,
  handleKeyPress,
  isLoading,
  isRecording,
  toggleRecording,
  supportsSpeech,
  sendMessage,
  setSelectedreferencedDocs,
  note = true,
  filePicker = true,
}: ChatComposerProps) {
  const [showFileDialog, setShowFileDialog] = useState(false);
  const [documents, setDocuments] = useState<Document[]>([]);

  // Listen for prompt insertion events from empty-state suggestions
  useEffect(() => {
    const handler = (e: Event) => {
      try {
        const custom = e as CustomEvent<{ text?: string }>;
        const txt = (custom.detail?.text || "").trim();
        if (txt) {
          setInput(txt);
          textareaRef.current?.focus();
        }
      } catch {}
    };
    window.addEventListener("chat-insert-prompt", handler as EventListener);
    return () => {
      window.removeEventListener(
        "chat-insert-prompt",
        handler as EventListener
      );
    };
  }, [setInput, textareaRef]);

  return (
    <>
      <div
        id="chat-composer"
        className="border-t p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
      >
        <div className="mx-auto">
          {/* Referenced Documents */}
          {items.length > 0 && (
            <div className="mb-3 flex flex-wrap gap-2">
              {items.map((doc) => (
                <Badge key={doc.id} variant="secondary" className="px-2 py-1">
                  <File className="h-3 w-3 mr-1" />
                  {doc.name}
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-4 w-4 p-0 ml-1 hover:bg-destructive hover:text-destructive-foreground"
                    onClick={() => toggleDocumentSelection(doc)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ))}
            </div>
          )}

          <div className="flex items-center space-x-2">
            {filePicker && (
              <div className="flex space-x-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowFileDialog(true)}
                >
                  <File className="h-4 w-4" />
                </Button>
              </div>
            )}

            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Ask me anything about your documents..."
                disabled={isLoading}
                className="min-h-[44px] max-h-[120px] resize-none pr-12 border-input focus:border-primary"
                rows={1}
              />
              <Button
                variant={isRecording ? "destructive" : "ghost"}
                size="sm"
                className="absolute right-1 top-1"
                onClick={toggleRecording}
                disabled={!supportsSpeech}
                title={
                  !supportsSpeech
                    ? "Browser tidak mendukung speech recognition"
                    : isRecording
                    ? "Stop recording"
                    : "Start recording"
                }
              >
                {isRecording ? (
                  <Square className="h-4 w-4" />
                ) : (
                  <Mic className="h-4 w-4" />
                )}
              </Button>
            </div>

            <Button
              onClick={() => sendMessage()}
              disabled={!input.trim() || isLoading}
              size="sm"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>

          {note && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Press Enter to send • Shift+Enter for new line • Use @ to
              reference documents
            </p>
          )}
        </div>
      </div>
      <FilesDocumentsDialog
        show={showFileDialog}
        onClose={() => setShowFileDialog(false)}
        selectedDocuments={items}
        setSelectedDocuments={setItems}
        onSubmit={(urls, docs) => {
          // Store referenced docs as objects { name, url }
          try {
            const refs = docs.map((d: any) => ({
              name: d.name,
              url: d.url,
            }));
            setSelectedreferencedDocs(refs);
          } catch (e) {
            console.warn("Failed to map referenced docs:", e);
          }
          // Mirror selection for UI badges (name display)
          try {
            const mapped = docs.map((d: any) => ({
              id: d.id,
              name: d.name,
              type:
                typeof d.fileType === "string"
                  ? d.fileType
                  : d.type || "document",
              uploadDate: new Date(d.updatedAt || d.createdAt || Date.now()),
            }));
            setItems(mapped);
          } catch (e) {
            console.warn("Failed to map selected docs for UI display:", e);
          }
        }}
      />
    </>
  );
}
