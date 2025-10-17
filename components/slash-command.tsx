"use client";

import { Extension } from "@tiptap/core";
import { ReactRenderer } from "@tiptap/react";
import Suggestion from "@tiptap/suggestion";
import { PluginKey } from "@tiptap/pm/state";
import tippy from "tippy.js";
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
  let popup: any = null;

  return {
    onStart: (props: any) => {
      component = new ReactRenderer(SlashCommandsList, {
        props: {
          items: props.items,
          command: props.command,
        },
        editor: props.editor,
      });

      if (!props.clientRect) {
        return;
      }

      popup = tippy("body", {
        getReferenceClientRect: props.clientRect,
        appendTo: () => document.body,
        content: component.element,
        showOnCreate: true,
        interactive: true,
        trigger: "manual",
        placement: "bottom-start",
      });
    },

    onUpdate(props: any) {
      component?.updateProps(props);

      if (!props.clientRect) {
        return;
      }

      popup?.[0]?.setProps({
        getReferenceClientRect: props.clientRect,
      });
    },

    onKeyDown(props: any) {
      if (props.event.key === "Escape") {
        popup?.[0]?.hide();
        return true;
      }

      return (component?.ref as SlashCommandRef)?.onKeyDown?.(props);
    },

    onExit() {
      popup?.[0]?.destroy();
      component?.destroy();
    },
  };
};
