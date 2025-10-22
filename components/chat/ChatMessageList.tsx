"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bot, User } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import type { ChatMessage } from "./types";

export interface ChatMessageListProps {
  messages: ChatMessage[];
  className?: string;
}

export function ChatMessageList({ messages, className }: ChatMessageListProps) {
  return (
    <ScrollArea className={className ?? "flex-1 px-4"}>
      {messages.length === 0 && (
        <div className="flex flex-col items-center justify-center h-full text-center p-6">
          <Bot className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="font-semibold text-lg mb-2">AI Assistant Ready</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Ask me anything about your document or get help with writing,
            editing, and formatting.
          </p>
          <div className="space-y-2 text-xs text-muted-foreground">
            <p>• "Help me improve this paragraph"</p>
            <p>• "Summarize the main points"</p>
            <p>• "Check grammar and style"</p>
            <p>• "Generate an outline"</p>
          </div>
        </div>
      )}

      {messages.map((message) => (
        <div
          key={message.id}
          className={`mb-4 ${
            message.role === "user" ? "text-right" : "text-left"
          }`}
        >
          <div
            className={`inline-block max-w-[80%] p-3 rounded-lg ${
              message.role === "user" ? "bg-blue-600 text-white" : "bg-muted"
            }`}
          >
            <p className="text-sm whitespace-pre-wrap">{message.content}</p>
            <p
              className={`text-xs opacity-70 mt-1 ${
                message.role === "user" ? "text-blue-100" : "text-gray-500"
              }`}
            >
              {message.timestamp.toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>
        </div>
      ))}
    </ScrollArea>
  );
}