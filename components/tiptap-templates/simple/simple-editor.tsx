"use client";

import * as React from "react";
import { EditorContent, EditorContext, useEditor, Editor } from "@tiptap/react";

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit";
import { Image } from "@tiptap/extension-image";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { TextAlign } from "@tiptap/extension-text-align";
import { Typography } from "@tiptap/extension-typography";
import { Highlight } from "@tiptap/extension-highlight";
import { Subscript } from "@tiptap/extension-subscript";
import { Superscript } from "@tiptap/extension-superscript";
import { Selection } from "@tiptap/extensions";
import { TextStyle } from "@tiptap/extension-text-style";
import { FontFamily } from "@tiptap/extension-font-family";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import { Extension } from "@tiptap/core";

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button";
import { Spacer } from "@/components/tiptap-ui-primitive/spacer";
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/tiptap-ui-primitive/dropdown-menu";
import { Card, CardBody } from "@/components/tiptap-ui-primitive/card";

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension";
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension";
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss";
import "@/components/tiptap-node/code-block-node/code-block-node.scss";
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss";
import "@/components/tiptap-node/list-node/list-node.scss";
import "@/components/tiptap-node/image-node/image-node.scss";
import "@/components/tiptap-node/heading-node/heading-node.scss";
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss";

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu";
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button";
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu";
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button";
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button";
import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover";
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "@/components/tiptap-ui/link-popover";
import { MarkButton } from "@/components/tiptap-ui/mark-button";
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button";
import { UndoRedoButton } from "@/components/tiptap-ui/undo-redo-button";

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon";
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon";
import { LinkIcon } from "@/components/tiptap-icons/link-icon";
import { ChevronDownIcon } from "@/components/tiptap-icons/chevron-down-icon";

// --- Hooks ---
import { useIsMobile } from "@/hooks/use-mobile";
import { useWindowSize } from "@/hooks/use-window-size";
import { useCursorVisibility } from "@/hooks/use-cursor-visibility";

// --- Components ---
import { ThemeToggle } from "@/components/tiptap-templates/simple/theme-toggle";

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils";

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss";

import content from "@/components/tiptap-templates/simple/data/content.json";
import { TableIcon } from "lucide-react";
import { Input } from "@/components/ui/input";
import "@/components/tiptap-node/table-node/table-node.scss";


// --- Custom Extension: Font Size mapped to textStyle ---
const FontSize = Extension.create({
  name: "fontSize",
  addGlobalAttributes() {
    return [
      {
        types: ["textStyle"],
        attributes: {
          fontSize: {
            default: null,
            renderHTML: (attributes) => {
              if (!attributes.fontSize) return {};
              return { style: `font-size: ${attributes.fontSize}` };
            },
            parseHTML: (element) => {
              const fontSize = (element as HTMLElement).style.fontSize;
              return fontSize || null;
            },
          },
        },
      },
    ];
  },
});

const FontFamilyDropdown = ({ editor }: { editor: Editor | null }) => {
  const families = [
    { label: "Inter", value: "Inter, sans-serif" },
    { label: "DM Sans", value: "DM Sans, sans-serif" },
    { label: "Arial", value: "Arial, Helvetica, sans-serif" },
    { label: "Times New Roman", value: '"Times New Roman", Times, serif' },
    { label: "Roboto", value: "Roboto, Arial, sans-serif" },
    { label: "Georgia", value: "Georgia, serif" },
    { label: "Courier New", value: '"Courier New", Courier, monospace' },
  ];

  const canSet = !!editor?.isEditable;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          data-style="ghost"
          disabled={!canSet}
          tooltip="Font Family"
          aria-label="Font Family"
        >
          <span className="tiptap-button-text">Font</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <Card>
          <CardBody>
            {families.map((f) => (
              <DropdownMenuItem key={f.value} asChild>
                <Button
                  type="button"
                  data-style="ghost"
                  onClick={() =>
                    editor
                      ?.chain()
                      .focus()
                      .setMark("textStyle", { fontFamily: f.value })
                      .run()
                  }
                >
                  <span
                    className="tiptap-button-text"
                    style={{ fontFamily: f.value }}
                  >
                    {f.label}
                  </span>
                </Button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild>
              <Button
                type="button"
                data-style="ghost"
                onClick={() =>
                  editor
                    ?.chain()
                    .focus()
                    .setMark("textStyle", { fontFamily: null })
                    .run()
                }
              >
                <span className="tiptap-button-text">Default</span>
              </Button>
            </DropdownMenuItem>
          </CardBody>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const FontSizeDropdown = ({ editor }: { editor: Editor | null }) => {
  const sizes = [
    { label: "12", value: "12px" },
    { label: "14", value: "14px" },
    { label: "16", value: "16px" },
    { label: "18", value: "18px" },
    { label: "24", value: "24px" },
    { label: "32", value: "32px" },
  ];
  const canSet = !!editor?.isEditable;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          data-style="ghost"
          disabled={!canSet}
          tooltip="Font Size"
          aria-label="Font Size"
        >
          <span className="tiptap-button-text">Size</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <Card>
          <CardBody>
            {sizes.map((s) => (
              <DropdownMenuItem key={s.value} asChild>
                <Button
                  type="button"
                  data-style="ghost"
                  onClick={() =>
                    editor
                      ?.chain()
                      .focus()
                      .setMark("textStyle", { fontSize: s.value })
                      .run()
                  }
                >
                  <span className="tiptap-button-text">{s.label}</span>
                </Button>
              </DropdownMenuItem>
            ))}
            <DropdownMenuItem asChild>
              <Button
                type="button"
                data-style="ghost"
                onClick={() =>
                  editor
                    ?.chain()
                    .focus()
                    .setMark("textStyle", { fontSize: null })
                    .run()
                }
              >
                <span className="tiptap-button-text">Default</span>
              </Button>
            </DropdownMenuItem>
          </CardBody>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const TableDropdownMenu = ({ editor }: { editor: Editor | null }) => {
  const canSet = !!editor?.isEditable;

  const hasInsertTable = !!(editor && (editor as any).commands?.insertTable);
  const hasAddRowAfter = !!(editor && (editor as any).commands?.addRowAfter);
  const hasAddColumnAfter = !!(editor && (editor as any).commands?.addColumnAfter);
  const hasDeleteTable = !!(editor && (editor as any).commands?.deleteTable);

  const [rows, setRows] = React.useState<number>(3);
  const [cols, setCols] = React.useState<number>(3);

  const fallbackInsertTable = React.useCallback((r: number, c: number) => {
    if (!editor) return false;

    // Build a basic table JSON structure with a header row
    const cols = Math.max(1, Math.min(20, c));
    const rows = Math.max(1, Math.min(20, r));

    const headerCells = Array.from({ length: cols }).map(() => ({
      type: "tableHeader",
      content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
    }));

    const bodyRow = () => ({
      type: "tableRow",
      content: Array.from({ length: cols }).map(() => ({
        type: "tableCell",
        content: [{ type: "paragraph", content: [{ type: "text", text: "" }] }],
      })),
    });

    const tableNode = {
      type: "table",
      content: [
        { type: "tableRow", content: headerCells },
        ...Array.from({ length: Math.max(0, rows - 1) }).map(() => bodyRow()),
      ],
    };

    return editor.commands.insertContent(tableNode);
  }, [editor]);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          data-style="ghost"
          disabled={!canSet}
          tooltip="Table"
          aria-label="Table"
        >
          <TableIcon className="tiptap-button-icon" />
          <ChevronDownIcon className="tiptap-button-dropdown-small" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <Card>
          <CardBody>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Rows</span>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={rows}
                  onChange={(e) => setRows(Number(e.target.value) || 1)}
                  className="h-8 w-16"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Cols</span>
                <Input
                  type="number"
                  min={1}
                  max={20}
                  value={cols}
                  onChange={(e) => setCols(Number(e.target.value) || 1)}
                  className="h-8 w-16"
                />
              </div>
              <Button
                type="button"
                data-style="ghost"
                disabled={!hasInsertTable && !editor}
                onClick={() => {
                  if (!editor) return;
                  if (hasInsertTable) {
                    editor
                      .chain()
                      .focus()
                      .insertTable({ rows, cols, withHeaderRow: true })
                      .run();
                  } else {
                    fallbackInsertTable(rows, cols);
                  }
                }}
              >
                <span className="tiptap-button-text">Insert</span>
              </Button>
            </div>
            <DropdownMenuItem asChild>
              <Button
                type="button"
                data-style="ghost"
                disabled={!hasInsertTable}
                onClick={() => {
                  if (!editor) return;
                  if (hasInsertTable) {
                    editor
                      .chain()
                      .focus()
                      .insertTable({ rows: 3, cols: 3, withHeaderRow: true })
                      .run();
                  } else {
                    fallbackInsertTable(3, 3);
                  }
                }}
              >
                <span className="tiptap-button-text">Insert 3x3</span>
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Button
                type="button"
                data-style="ghost"
                disabled={!hasAddRowAfter}
                onClick={() => editor?.chain().focus().addRowAfter().run()}
              >
                <span className="tiptap-button-text">Add Row Below</span>
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Button
                type="button"
                data-style="ghost"
                disabled={!hasAddColumnAfter}
                onClick={() => editor?.chain().focus().addColumnAfter().run()}
              >
                <span className="tiptap-button-text">Add Column Right</span>
              </Button>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Button
                type="button"
                data-style="ghost"
                disabled={!hasDeleteTable}
                onClick={() => editor?.chain().focus().deleteTable().run()}
              >
                <span className="tiptap-button-text">Delete Table</span>
              </Button>
            </DropdownMenuItem>
          </CardBody>
        </Card>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
  editor,
}: {
  onHighlighterClick: () => void;
  onLinkClick: () => void;
  isMobile: boolean;
  editor: Editor | null;
}) => {
  return (
    <>
      <Spacer />

      <ToolbarGroup>
        <UndoRedoButton action="undo" />
        <UndoRedoButton action="redo" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu levels={[1, 2, 3, 4, 5, 6]} portal={isMobile} />
        <ListDropdownMenu
          types={["bulletList", "orderedList", "taskList"]}
          portal={isMobile}
        />
        <BlockquoteButton />
        <CodeBlockButton />
        <TableDropdownMenu editor={editor} />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" />
        <MarkButton type="italic" />
        <MarkButton type="strike" />
        <MarkButton type="code" />
        <MarkButton type="underline" />
        {!isMobile ? (
          <ColorHighlightPopover />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} />
        )}
        {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="superscript" />
        <MarkButton type="subscript" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <TextAlignButton align="left" />
        <TextAlignButton align="center" />
        <TextAlignButton align="right" />
        <TextAlignButton align="justify" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <FontFamilyDropdown editor={editor} />
        <FontSizeDropdown editor={editor} />
        <ImageUploadButton text="Add" />
      </ToolbarGroup>

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      {/* <ToolbarGroup>
        <ThemeToggle />
      </ToolbarGroup> */}
    </>
  );
};

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link";
  onBack: () => void;
}) => (
  <>
    <ToolbarGroup>
      <Button data-style="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
);

export function SimpleEditor({
  initialHTML,
  onEditorReady,
}: {
  initialHTML?: string;
  onEditorReady?: (editor: Editor) => void;
}) {
  const isMobile = useIsMobile();
  const { height } = useWindowSize();
  const [mobileView, setMobileView] = React.useState<
    "main" | "highlighter" | "link"
  >("main");
  const toolbarRef = React.useRef<HTMLDivElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: "simple-editor",
      },
    },
    extensions: [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      TextStyle,
      FontFamily,
      FontSize,
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error) => console.error("Upload failed:", error),
      }),
    ],
    content: initialHTML ?? content,
  });

  React.useEffect(() => {
    if (editor && onEditorReady) onEditorReady(editor);
  }, [editor, onEditorReady]);

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  });

  React.useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main");
    }
  }, [isMobile, mobileView]);

  return (
    <div className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={{
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : {}),
          }}
        >
          {mobileView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              isMobile={isMobile}
              editor={editor}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  );
}
