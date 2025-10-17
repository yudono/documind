"use client";

import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import { computePosition, flip, shift, autoUpdate, offset } from "@floating-ui/dom";
import React, {
  useState,
  useEffect,
  forwardRef,
  useImperativeHandle,
} from "react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Card } from "@/components/ui/card";
import {
  Bot,
  FileText,
  Mail,
  Calendar,
  Users,
  Briefcase,
  BookOpen,
  PenTool,
} from "lucide-react";

interface SlashCommandProps {
  items: any[];
  command: (item: any) => void;
}

interface SlashCommandRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

const SlashCommandsList = forwardRef<SlashCommandRef, SlashCommandProps>(
  ({ items, command }, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    const selectItem = (index: number) => {
      const item = items[index];
      if (item) {
        command(item);
      }
    };

    const upHandler = () => {
      setSelectedIndex((selectedIndex + items.length - 1) % items.length);
    };

    const downHandler = () => {
      setSelectedIndex((selectedIndex + 1) % items.length);
    };

    const enterHandler = () => {
      selectItem(selectedIndex);
    };

    useEffect(() => setSelectedIndex(0), [items]);

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === "ArrowUp") {
          upHandler();
          return true;
        }

        if (event.key === "ArrowDown") {
          downHandler();
          return true;
        }

        if (event.key === "Enter") {
          enterHandler();
          return true;
        }

        return false;
      },
    }));

    return (
      <Card className="w-72 p-2 shadow-lg border">
        <CommandList>
          {items.length ? (
            <CommandGroup>
              {items.map((item, index) => (
                <CommandItem
                  key={index}
                  onSelect={() => selectItem(index)}
                  className={`flex items-center gap-2 p-2 cursor-pointer rounded ${
                    index === selectedIndex ? "bg-accent" : ""
                  }`}
                >
                  <item.icon className="h-4 w-4" />
                  <div className="flex flex-col">
                    <span className="font-medium">{item.title}</span>
                    <span className="text-sm text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          ) : (
            <CommandEmpty>No results found.</CommandEmpty>
          )}
        </CommandList>
      </Card>
    );
  }
);

SlashCommandsList.displayName = "SlashCommandsList";

export const SlashCommand = Extension.create({
  name: "slashCommand",

  addOptions() {
    return {
      suggestion: {
        char: "/",
        pluginKey: new PluginKey("slashCommand"),
        command: ({ editor, range, props }: any) => {
          props.command({ editor, range });
        },
        items: getSuggestionItems,
        render: renderItems,
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
      }),
    ];
  },
});

export const getSuggestionItems = ({ query }: { query: string }) => {
  const items = [
    {
      title: "AI Generate Document",
      description: "Generate a complete document with AI",
      icon: Bot,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        // This will trigger the AI generation modal
        window.dispatchEvent(
          new CustomEvent("openAIGeneration", {
            detail: { type: "document", editor, range },
          })
        );
      },
    },
    {
      title: "Business Proposal",
      description: "Generate a professional business proposal",
      icon: Briefcase,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        window.dispatchEvent(
          new CustomEvent("openAIGeneration", {
            detail: { type: "business_proposal", editor, range },
          })
        );
      },
    },
    {
      title: "Project Report",
      description: "Create a detailed project report",
      icon: FileText,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        window.dispatchEvent(
          new CustomEvent("openAIGeneration", {
            detail: { type: "project_report", editor, range },
          })
        );
      },
    },
    {
      title: "Meeting Minutes",
      description: "Generate meeting minutes template",
      icon: Users,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        window.dispatchEvent(
          new CustomEvent("openAIGeneration", {
            detail: { type: "meeting_minutes", editor, range },
          })
        );
      },
    },
    {
      title: "Email Template",
      description: "Create a professional email template",
      icon: Mail,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        window.dispatchEvent(
          new CustomEvent("openAIGeneration", {
            detail: { type: "email_template", editor, range },
          })
        );
      },
    },
    {
      title: "Research Paper",
      description: "Generate academic research paper structure",
      icon: BookOpen,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        window.dispatchEvent(
          new CustomEvent("openAIGeneration", {
            detail: { type: "research_paper", editor, range },
          })
        );
      },
    },
    {
      title: "Creative Writing",
      description: "Start creative writing with AI assistance",
      icon: PenTool,
      command: ({ editor, range }: any) => {
        editor.chain().focus().deleteRange(range).run();
        window.dispatchEvent(
          new CustomEvent("openAIGeneration", {
            detail: { type: "creative_writing", editor, range },
          })
        );
      },
    },
  ];

  return items.filter(
    (item) =>
      item.title.toLowerCase().includes(query.toLowerCase()) ||
      item.description.toLowerCase().includes(query.toLowerCase())
  );
};

export const renderItems = () => {
  let component: ReactRenderer | null = null;
  let popup: HTMLElement | null = null;
  let cleanup: (() => void) | null = null;

  return {
    onStart: (props: any) => {
      component = new ReactRenderer(SlashCommandsList, {
        editor: props.editor,
        props: {
          items: props.items,
          command: props.command,
        },
      });

      if (!props.clientRect) {
        return;
      }

      // Create popup element
      popup = document.createElement('div');
      popup.style.position = 'absolute';
      popup.style.zIndex = '1000';
      popup.style.visibility = 'hidden';
      popup.appendChild(component.element);
      document.body.appendChild(popup);

      // Create virtual reference element
      const virtualElement = {
        getBoundingClientRect: props.clientRect,
      };

      // Position the popup using floating-ui
      const updatePosition = () => {
        if (!popup) return;
        
        computePosition(virtualElement, popup, {
          placement: 'bottom-start',
          middleware: [
            offset(8),
            flip(),
            shift({ padding: 8 })
          ],
        }).then(({ x, y }) => {
          if (popup) {
            popup.style.left = `${x}px`;
            popup.style.top = `${y}px`;
            popup.style.visibility = 'visible';
          }
        });
      };

      updatePosition();

      // Set up auto-update
      cleanup = autoUpdate(virtualElement, popup, updatePosition);
    },

    onUpdate(props: any) {
      component?.updateProps(props);

      if (!props.clientRect || !popup) {
        return;
      }

      // Update virtual element reference
      const virtualElement = {
        getBoundingClientRect: props.clientRect,
      };

      // Update position
      computePosition(virtualElement, popup, {
        placement: 'bottom-start',
        middleware: [
          offset(8),
          flip(),
          shift({ padding: 8 })
        ],
      }).then(({ x, y }) => {
        if (popup) {
          popup.style.left = `${x}px`;
          popup.style.top = `${y}px`;
        }
      });
    },

    onKeyDown(props: any) {
      if (props.event.key === "Escape") {
        if (popup) {
          popup.style.visibility = 'hidden';
        }
        return true;
      }

      return (component?.ref as SlashCommandRef)?.onKeyDown?.(props);
    },

    onExit() {
      if (cleanup) {
        cleanup();
        cleanup = null;
      }
      if (popup) {
        document.body.removeChild(popup);
        popup = null;
      }
      component?.destroy();
    },
  };
};
