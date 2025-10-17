"use client";

import React, {
  useCallback,
  useRef,
  useImperativeHandle,
  forwardRef,
  useState,
  useEffect,
} from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import { StarterKit } from "@tiptap/starter-kit";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Color } from "@tiptap/extension-color";
import { Highlight } from "@tiptap/extension-highlight";
import { TextAlign } from "@tiptap/extension-text-align";
import { Underline } from "@tiptap/extension-underline";
import { Link } from "@tiptap/extension-link";
import { Image } from "@tiptap/extension-image";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { BulletList } from "@tiptap/extension-bullet-list";
import { OrderedList } from "@tiptap/extension-ordered-list";
import { ListItem } from "@tiptap/extension-list-item";
import { Heading } from "@tiptap/extension-heading";
import { Blockquote } from "@tiptap/extension-blockquote";
import { CodeBlock } from "@tiptap/extension-code-block";
import { Strike } from "@tiptap/extension-strike";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { SlashCommand, getSuggestionItems, renderItems } from "./slash-command";
import PlusButton from "./plus-button";

interface TiptapEditorProps {
  onUpdate?: (content: string) => void;
  onSelectionUpdate?: (selection: {
    text: string;
    range: { from: number; to: number } | null;
  }) => void;
  initialContent?: string;
  className?: string;
}

export interface TiptapEditorRef {
  getHTML: () => string;
  setContent: (content: string) => void;
  focus: () => void;
  blur: () => void;
  isEditable: () => boolean;
  setEditable: (editable: boolean) => void;
  editor: any; // Expose the editor instance for toolbar functionality
}

const TiptapEditor = forwardRef<TiptapEditorRef, TiptapEditorProps>(
  (
    {
      onUpdate,
      onSelectionUpdate,
      initialContent = "<p>Start writing your document...</p>",
      className,
    },
    ref
  ) => {
    const autoSaveIntervalRef = useRef<NodeJS.Timeout | null>(null);
    const [plusButtonVisible, setPlusButtonVisible] = useState(false);
    const [plusButtonPosition, setPlusButtonPosition] = useState({ top: 0, left: 0 });
    const editorContainerRef = useRef<HTMLDivElement>(null);

    const editor = useEditor({
      immediatelyRender: false,
      extensions: [
        StarterKit.configure({
          // Disable default heading since we'll configure it separately
          heading: false,
          // Disable default blockquote since we'll configure it separately
          blockquote: false,
          // Disable default codeBlock since we'll configure it separately
          codeBlock: false,
          // Disable default strike since we'll configure it separately
          strike: false,
        }),
        Heading.configure({
          levels: [1, 2, 3, 4, 5, 6],
        }),
        Blockquote,
        CodeBlock.configure({
          HTMLAttributes: {
            class: "bg-gray-100 p-4 rounded-md font-mono text-sm",
          },
        }),
        Strike,
        Subscript,
        Superscript,
        TextStyle,
        FontFamily.configure({
          types: ["textStyle"],
        }),
        Color,
        Highlight.configure({ multicolor: true }),
        TextAlign.configure({
          types: ["heading", "paragraph"],
        }),
        Underline,
        Link.configure({
          openOnClick: false,
        }),
        Image.configure({
          HTMLAttributes: {
            class: "max-w-full h-auto rounded-md",
          },
        }),
        Table.configure({
          resizable: true,
        }),
        TableRow,
        TableHeader,
        TableCell,
        BulletList,
        OrderedList,
        ListItem,
        SlashCommand,
      ],
      content: initialContent,
      onUpdate: ({ editor }) => {
        if (onUpdate) {
          // Clear previous timeout
          if (autoSaveIntervalRef.current) {
            clearTimeout(autoSaveIntervalRef.current);
          }
          // Set new timeout for auto-save
          autoSaveIntervalRef.current = setTimeout(() => {
            onUpdate(editor.getHTML());
          }, 2000); // Auto-save after 2 seconds of inactivity
        }
      },
      onSelectionUpdate: ({ editor }) => {
        if (onSelectionUpdate) {
          const { from, to } = editor.state.selection;
          if (from !== to) {
            const text = editor.state.doc.textBetween(from, to);
            onSelectionUpdate({ text, range: { from, to } });
          } else {
            onSelectionUpdate({ text: "", range: null });
          }
        }
      },
    });

    // Expose editor methods through ref
    useImperativeHandle(
      ref,
      () => ({
        getHTML: () => editor?.getHTML() || "",
        setContent: (content: string) => editor?.commands.setContent(content),
        focus: () => editor?.commands.focus(),
        blur: () => editor?.commands.blur(),
        isEditable: () => editor?.isEditable || false,
        setEditable: (editable: boolean) => editor?.setEditable(editable),
        editor: editor, // Expose the editor instance
      }),
      [editor]
    );

    // Cleanup timeout on unmount
    React.useEffect(() => {
      return () => {
        if (autoSaveIntervalRef.current) {
          clearTimeout(autoSaveIntervalRef.current);
        }
      };
    }, []);

    // Plus button logic
    useEffect(() => {
      if (!editor) return;

      const handleSelectionUpdate = () => {
        const { selection } = editor.state;
        const { $from } = selection;
        
        // Show plus button at the beginning of empty lines
        if (selection.empty && $from.parentOffset === 0) {
          const coords = editor.view.coordsAtPos($from.pos);
          const editorRect = editorContainerRef.current?.getBoundingClientRect();
          
          if (coords && editorRect) {
            setPlusButtonPosition({
              top: coords.top - editorRect.top + 4,
              left: coords.left - editorRect.left
            });
            setPlusButtonVisible(true);
          }
        } else {
          setPlusButtonVisible(false);
        }
      };

      editor.on('selectionUpdate', handleSelectionUpdate);
      
      return () => {
        editor.off('selectionUpdate', handleSelectionUpdate);
      };
    }, [editor]);

    if (!editor) {
      return (
        <div className="min-h-[400px] animate-pulse bg-gray-100 rounded-md" />
      );
    }

    return (
      <div className={className} ref={editorContainerRef} style={{ position: 'relative' }}>
        <EditorContent
          editor={editor}
          className="prose prose-sm sm:prose lg:prose-lg xl:prose-xl mx-auto focus:outline-none min-h-[400px] p-4"
        />
        <PlusButton
          editor={editor}
          position={plusButtonPosition}
          visible={plusButtonVisible}
          onClose={() => setPlusButtonVisible(false)}
        />
      </div>
    );
  }
);

TiptapEditor.displayName = "TiptapEditor";

export default TiptapEditor;
