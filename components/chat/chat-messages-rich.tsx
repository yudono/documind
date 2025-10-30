"use client";

import React, { forwardRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Bot, User, Copy, RefreshCw, ThumbsDown, ThumbsUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "@/components/ui/code-block";
import ResourceFile from "@/components/resource-file";
import { cn } from "@/lib/utils";
import type { ChatMessage } from "./types";
import { formatTime } from "./types";
import { toast } from "sonner";

export interface ChatMessagesRichProps {
  messages: ChatMessage[];
  isLoadingMessages?: boolean;
  isLoadingSessions?: boolean;
}

export const ChatMessagesRich = forwardRef<
  HTMLDivElement,
  ChatMessagesRichProps
>(function ChatMessagesRich(
  { messages, isLoadingMessages = false, isLoadingSessions = false },
  ref
) {
  const [expand, setExpand] = useState<string[]>([]);

  const copyMessage = (content: string) => {
    toast.success("Copied to clipboard");
    navigator.clipboard.writeText(content);
  };

  const insertPrompt = (text: string) => {
    const el = document.getElementById("chat-composer");
    el?.scrollIntoView({ behavior: "smooth", block: "end" });
    try {
      const evt = new CustomEvent("chat-insert-prompt", {
        detail: { text },
      });
      window.dispatchEvent(evt);
    } catch {}
  };

  return (
    <ScrollArea className="flex-1 p-4" ref={ref as any}>
      <div className="mx-auto space-y-6">
        {isLoadingMessages || isLoadingSessions ? (
          <div className="space-y-6">
            {[...Array(6)].map((_, i) => (
              <div key={`skeleton-msg-${i}`} className="space-y-6">
                <div className="flex items-start space-x-3">
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                  <div className="h-20 w-2/3 bg-muted rounded-2xl animate-pulse" />
                </div>
                <div className="flex items-start justify-end space-x-3">
                  <div className="h-20 w-2/3 bg-muted rounded-2xl animate-pulse" />
                  <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <>
            {messages.length === 0 ? (
              <div className="mt-24 flex flex-col items-center justify-center py-12 px-6 text-center space-y-4">
                <div className="text-sm text-muted-foreground">
                  Belum ada pesan.
                </div>
                <div className="text-xs text-muted-foreground">
                  Mulai dengan pertanyaan atau gunakan @ untuk referensi
                  dokumen.
                </div>
                <div className="flex flex-wrap gap-2 justify-center">
                  {[
                    {
                      label: "Ringkas dokumen",
                      text: "Ringkas dokumen berikut dan beri poin-poin penting.",
                    },
                    {
                      label: "Ambil poin penting",
                      text: "Ambil poin-poin penting dari dokumen berikut.",
                    },
                    {
                      label: "Jelaskan bagian ini",
                      text: "Jelaskan bagian ini secara sederhana untuk pemula.",
                    },
                    {
                      label: "Buat action items",
                      text: "Buat daftar action items berdasarkan isi dokumen.",
                    },
                    {
                      label: "Catatan rapat",
                      text: "Buat catatan rapat singkat dari dokumen ini.",
                    },
                  ].map((p) => (
                    <Button
                      key={p.label}
                      variant="outline"
                      size="sm"
                      onClick={() => insertPrompt(p.text)}
                    >
                      {p.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((message) => (
                <div
                  key={message.id}
                  className={`group flex items-start space-x-3 ${
                    message.role === "user"
                      ? "flex-row-reverse space-x-reverse"
                      : ""
                  }`}
                >
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarFallback
                      className={
                        message.role === "assistant"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted"
                      }
                    >
                      {message.role === "assistant" ? (
                        <Bot className="h-4 w-4" />
                      ) : (
                        <User className="h-4 w-4" />
                      )}
                    </AvatarFallback>
                  </Avatar>

                  <div
                    className={`flex-1 space-y-2 ${
                      message.role === "user" ? "flex flex-col items-end" : ""
                    }`}
                  >
                    <div
                      className={`rounded-2xl px-4 py-3 max-w-[80%] ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-white"
                      }`}
                    >
                      {message.isTyping ? (
                        <div className="flex items-center space-x-2 py-2">
                          <div className="flex space-x-1">
                            <div className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></div>
                            <div
                              className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: "0.1s" }}
                            ></div>
                            <div
                              className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"
                              style={{ animationDelay: "0.2s" }}
                            ></div>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            AI is thinking...
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="text-sm leading-relaxed">
                            {(() => {
                              const containsHtml =
                                typeof message.content === "string" &&
                                /<\/?[a-z][\s\S]*>/i.test(message.content);
                              if (
                                message.role === "assistant" &&
                                containsHtml
                              ) {
                                return "📄 Dokumen telah dibuat. Gunakan tombol download di bawah untuk mengunduh.";
                              }
                              if (message.role === "assistant") {
                                return (
                                  <div className="prose prose-sm max-w-none dark:prose-invert prose-pre:p-0 prose-code:text-sm">
                                    <ReactMarkdown
                                      remarkPlugins={[remarkGfm]}
                                      components={{
                                        code({
                                          node,
                                          inline,
                                          className,
                                          children,
                                          ...props
                                        }: any) {
                                          return (
                                            <CodeBlock
                                              className={className}
                                              inline={inline}
                                              {...props}
                                            >
                                              {String(children).replace(
                                                /\n$/,
                                                ""
                                              )}
                                            </CodeBlock>
                                          );
                                        },
                                        h1: ({ children }) => (
                                          <h1 className="text-xl font-bold mb-4 text-foreground">
                                            {children}
                                          </h1>
                                        ),
                                        h2: ({ children }) => (
                                          <h2 className="text-lg font-semibold mb-3 text-foreground">
                                            {children}
                                          </h2>
                                        ),
                                        h3: ({ children }) => (
                                          <h3 className="text-base font-medium mb-2 text-foreground">
                                            {children}
                                          </h3>
                                        ),
                                        p: ({ children }) => (
                                          <p className="mb-3 text-foreground leading-relaxed">
                                            {children}
                                          </p>
                                        ),
                                        ul: ({ children }) => (
                                          <ul className="list-disc list-inside mb-3 space-y-1 text-foreground">
                                            {children}
                                          </ul>
                                        ),
                                        ol: ({ children }) => (
                                          <ol className="list-decimal list-inside mb-3 space-y-1 text-foreground">
                                            {children}
                                          </ol>
                                        ),
                                        li: ({ children }) => (
                                          <li className="text-foreground">
                                            {children}
                                          </li>
                                        ),
                                        blockquote: ({ children }) => (
                                          <blockquote className="border-l-4 border-muted-foreground pl-4 italic mb-3 text-muted-foreground">
                                            {children}
                                          </blockquote>
                                        ),
                                        table: ({ children }) => (
                                          <div className="overflow-x-auto mb-3">
                                            <table className="min-w-full border-collapse border border-border">
                                              {children}
                                            </table>
                                          </div>
                                        ),
                                        th: ({ children }) => (
                                          <th className="border border-border px-3 py-2 bg-muted font-medium text-left">
                                            {children}
                                          </th>
                                        ),
                                        td: ({ children }) => (
                                          <td className="border border-border px-3 py-2">
                                            {children}
                                          </td>
                                        ),
                                        strong: ({ children }) => (
                                          <strong className="font-semibold text-foreground">
                                            {children}
                                          </strong>
                                        ),
                                        em: ({ children }) => (
                                          <em className="italic text-foreground">
                                            {children}
                                          </em>
                                        ),
                                      }}
                                    >
                                      {message.content}
                                    </ReactMarkdown>
                                  </div>
                                );
                              }
                              return message.content;
                            })()}
                          </div>
                        </>
                      )}
                    </div>

                    {message.documentFile && (
                      <div className={cn("mt-2 flex flex-wrap gap-1")}>
                        <ResourceFile resource={message.documentFile} />
                      </div>
                    )}

                    {message.referencedDocs && (
                      <>
                        {message.referencedDocs.length > 0 && (
                          <div
                            className={cn(
                              "mt-2 flex flex-wrap gap-1",
                              expand.includes(message.id)
                                ? "h-auto"
                                : "h-[80px] overflow-hidden",
                              message.role === "user"
                                ? "justify-end"
                                : "justify-start"
                            )}
                          >
                            {message.referencedDocs.map((doc, index) => (
                              <ResourceFile key={index} resource={doc} />
                            ))}
                          </div>
                        )}
                        {message.referencedDocs.length > 3 && (
                          <div
                            className="text-xs text-foreground cursor-pointer"
                            onClick={() => {
                              setExpand(
                                expand.includes(message.id)
                                  ? expand.filter((x) => x !== message.id)
                                  : [...expand, message.id]
                              );
                            }}
                          >
                            {expand.includes(message.id)
                              ? "Hide all files"
                              : "Show all files"}
                          </div>
                        )}
                      </>
                    )}

                    <div
                      className={`flex items-center space-x-2 text-xs text-muted-foreground ${
                        message.role === "user"
                          ? "justify-end"
                          : "justify-start"
                      }`}
                    >
                      <span>{formatTime(message.timestamp)}</span>
                      {message.role === "assistant" && !message.isTyping && (
                        <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                                onClick={() => copyMessage(message.content)}
                              >
                                <Copy className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Copy message</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Regenerate</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <ThumbsUp className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Good response</TooltipContent>
                          </Tooltip>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 w-6 p-0"
                              >
                                <ThumbsDown className="h-3 w-3" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent>Poor response</TooltipContent>
                          </Tooltip>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </ScrollArea>
  );
});

export default ChatMessagesRich;
