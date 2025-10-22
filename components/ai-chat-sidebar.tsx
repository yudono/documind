"use client";

import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Bot, Send, MessageSquare, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

interface Message {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isTyping?: boolean;
}

interface AIChatSidebarProps {
  isVisible: boolean;
  onToggleVisibility: () => void;
  documentContent?: string;
  inline?: boolean;
}

export default function AIChatSidebar({
  isVisible,
  onToggleVisibility,
  documentContent = "",
  inline = false,
}: AIChatSidebarProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Send message to AI chatbot
  const sendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: inputMessage,
      role: "user",
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: inputMessage,
          context: documentContent,
          history: messages.slice(-5), // Send last 5 messages for context
        }),
      });

      if (response.ok) {
        const data = await response.json();
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          content: data.message,
          role: "assistant",
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }
    } catch (error) {
      console.error("Failed to send message:", error);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {/* AI Chatbot Sidebar */}
      {isVisible && (
        <Card
          className={cn(
            inline ? "h-full w-full" : "w-80 border-l shadow-lg z-40"
          )}
        >
          {/* Chatbot Header */}
          <CardHeader className="py-4">
            <CardTitle className="flex items-center text-lg">
              <Bot className="h-5 w-5 mr-2 text-blue-600" />
              AI Assistant
            </CardTitle>
          </CardHeader>

          {/* Messages */}
          <CardContent className="flex flex-col p-0 h-[calc(100vh-134px)]">
            <ScrollArea className="flex-1 px-4">
              {messages.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full text-center p-6">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="font-semibold text-lg mb-2">
                    AI Assistant Ready
                  </h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Ask me anything about your document or get help with
                    writing, editing, and formatting.
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
                      message.role === "user"
                        ? "bg-blue-600 text-white"
                        : "bg-muted"
                    }`}
                  >
                    <p className="text-sm">{message.content}</p>
                    <p className="text-xs opacity-70 mt-1">
                      {message.timestamp.toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>
              ))}

              {isTyping && (
                <div className="mb-4 text-left">
                  <div className="inline-block max-w-[80%] p-3 rounded-lg bg-muted">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-100"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce delay-200"></div>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </ScrollArea>

            {/* Input Area */}
            <div className="p-4 border-t">
              <div className="flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  placeholder="Ask AI assistant..."
                  onKeyPress={(e) => e.key === "Enter" && sendMessage()}
                  disabled={isTyping}
                />
                <Button
                  onClick={sendMessage}
                  disabled={!inputMessage.trim() || isTyping}
                  size="sm"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
}
