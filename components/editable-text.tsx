import React, { useEffect, useRef, useState } from "react";

type EditableTextProps = {
  value: string;
  onChange: (html: string) => void;
  onSubmit?: () => void;
  // Add placeholder support
  placeholder?: string;
};

// A self-contained contentEditable with a floating balloon toolbar.
// All formatting logic (bold/italic/underline, H1-H6, P) lives here.
export default function EditableText({
  value,
  onChange,
  onSubmit,
  placeholder,
}: EditableTextProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [active, setActive] = useState(false);
  // Derive empty state from value by stripping HTML tags
  const isEmpty = !value || value.replace(/<[^>]+>/g, "").trim().length === 0;

  useEffect(() => {
    // Sync initial value into the contentEditable on mount/prop change.
    const el = editorRef.current;
    if (!el) return;
    // Avoid clobbering user selection mid-edit: only set if differs.
    if (el.innerHTML !== value) {
      el.innerHTML = value || "";
    }
  }, [value]);

  const applyFormat = (cmd: "bold" | "italic" | "underline") => {
    // Use execCommand for inline formatting; modern editors still rely on it for quick prototyping.
    document.execCommand(cmd, false);
    // Emit updated HTML after formatting.
    emitChange();
  };

  const setBlockTag = (
    tagName: "p" | "h1" | "h2" | "h3" | "h4" | "h5" | "h6"
  ) => {
    // First try formatBlock
    const blockTag = `<${tagName}>`;
    const success = document.execCommand("formatBlock", false, blockTag);

    if (!success) {
      // Fallback: replace nearest block element inside our editor.
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      let node: Node | null = range.startContainer;
      const root = editorRef.current;
      if (!root) return;

      // Climb to the nearest element node within our editor.
      let el: HTMLElement | null = null;
      while (node) {
        if (node instanceof HTMLElement) {
          el = node;
          break;
        }
        node = node.parentNode;
      }

      if (!el) return;
      // Ensure the target is inside our editor container.
      if (!root.contains(el)) return;

      // Find block ancestor inside editor
      const blockAncestor = findNearestBlock(el, root);
      if (!blockAncestor) return;

      const newEl = document.createElement(tagName);
      // Move children
      while (blockAncestor.firstChild) {
        newEl.appendChild(blockAncestor.firstChild);
      }
      blockAncestor.replaceWith(newEl);
    }
    emitChange();
  };

  const findNearestBlock = (
    start: HTMLElement,
    root: HTMLElement
  ): HTMLElement | null => {
    const isBlock = (e: HTMLElement) => {
      const display = window.getComputedStyle(e).display;
      return (
        display === "block" || /^(P|H1|H2|H3|H4|H5|H6|DIV)$/i.test(e.tagName)
      );
    };
    let cur: HTMLElement | null = start;
    while (cur && cur !== root) {
      if (isBlock(cur)) return cur;
      cur = cur.parentElement;
    }
    return root; // default to root if none found
  };

  const applyInlineHeading = (level: 1 | 2 | 3 | 4 | 5 | 6) => {
    setBlockTag(`h${level}` as any);
  };

  const clearInlineHeading = () => {
    setBlockTag("p");
  };

  const emitChange = () => {
    const el = editorRef.current;
    if (!el) return;
    onChange(el.innerHTML);
  };

  const handleInput = () => emitChange();

  const handleFocus = () => setActive(true);
  const handleBlur = () => setActive(false);

  const handleKeyDown: React.KeyboardEventHandler<HTMLDivElement> = (e) => {
    if (onSubmit && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit();
    }
  };

  return (
    <div className="relative w-full">
      {/* Balloon toolbar */}
      {active && (
        <div className="absolute -top-10 left-0 z-10 flex items-center gap-2 rounded-md bg-muted px-2 py-1 shadow">
          <button
            type="button"
            className="text-xs px-2 py-1 hover:opacity-80"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat("bold")}
          >
            B
          </button>
          <button
            type="button"
            className="text-xs px-2 py-1 hover:opacity-80 italic"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat("italic")}
          >
            I
          </button>
          <button
            type="button"
            className="text-xs px-2 py-1 hover:opacity-80 underline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applyFormat("underline")}
          >
            U
          </button>

          <span className="mx-2 h-4 w-px bg-border" />

          {([1, 2, 3, 4, 5, 6] as const).map((lvl) => (
            <button
              key={lvl}
              type="button"
              className="text-xs px-2 py-1 hover:opacity-80"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applyInlineHeading(lvl)}
            >
              H{lvl}
            </button>
          ))}
          <button
            type="button"
            className="text-xs px-2 py-1 hover:opacity-80"
            onMouseDown={(e) => e.preventDefault()}
            onClick={clearInlineHeading}
          >
            P
          </button>
        </div>
      )}

      {/* Placeholder overlay when empty */}
      {placeholder && isEmpty && (
        <span className="pointer-events-none absolute left-0 top-0 text-muted-foreground text-sm">
          {placeholder}
        </span>
      )}

      <div
        ref={editorRef}
        className="prose outline-none min-h-[2.5rem]"
        contentEditable
        suppressContentEditableWarning
        onInput={handleInput}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onKeyDown={handleKeyDown}
      />
    </div>
  );
}
