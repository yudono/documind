"use client";

import React from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  MessageSquare,
  Clock,
  MoreHorizontal,
  Plus,
  Search,
} from "lucide-react";
import { normalizeText } from "@/lib/normalize-text";

export interface ChatSessionItem {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
  messageCount: number;
}

export interface ChatSessionsSidebarProps {
  sessions: ChatSessionItem[];
  selectedId?: string | null;
  isLoadingSessions?: boolean;
  isCreatingChat?: boolean;
  onCreateNew: () => void;
  onSelect: (session: ChatSessionItem) => void;
  onDelete: (id: string) => void;
}

export default function ChatSessionsSidebar({
  sessions,
  selectedId = null,
  isLoadingSessions = false,
  isCreatingChat = false,
  onCreateNew,
  onSelect,
  onDelete,
}: ChatSessionsSidebarProps) {
  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-96 border-l h-screen bg-muted/10 flex flex-col">
      <div className="p-4 border-b h-20 flex items-center w-full">
        <div className="flex items-center justify-between space-x-2 w-full">
          <h2 className="text-lg font-semibold flex-1">Chat History</h2>
          <Button size="sm" variant="outline">
            <Search className="h-4 w-4" />
          </Button>
          <Button
            onClick={onCreateNew}
            disabled={isCreatingChat}
            size="sm"
            variant="outline"
          >
            {isCreatingChat ? "Creating..." : "New Chat"}{" "}
            {!isCreatingChat && <Plus size={14} className="ml-2" />}
          </Button>
        </div>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-2">
          {isLoadingSessions ? (
            <div className="space-y-2">
              {[...Array(12)].map((_, i) => (
                <Card key={`skeleton-session-${i}`} className="cursor-default">
                  <CardContent className="p-3">
                    <div className="space-y-2 animate-pulse">
                      <div className="h-4 w-1/2 bg-muted rounded" />
                      <div className="flex items-center mt-2 space-x-2">
                        <div className="h-3 w-16 bg-muted rounded" />
                        <Separator orientation="vertical" className="h-3" />
                        <div className="h-3 w-10 bg-muted rounded" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            sessions.map((chatSession) => (
              <Card
                key={chatSession.id}
                className={`hover:bg-muted cursor-pointer ${
                  selectedId === chatSession.id ? "border border-primary" : ""
                }`}
                onClick={() => onSelect(chatSession)}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      {/* <h3 className="font-medium">{chatSession.title}</h3> */}
                      <p className="text-sm font-medium line-clamp-1 w-72">
                        {normalizeText(chatSession.lastMessage || "Untitled")}
                      </p>
                      <div className="flex items-center mt-2 space-x-2 text-xs text-muted-foreground">
                        <div className="flex items-center">
                          <Clock className="h-3 w-3 mr-1" />
                          {formatDate(chatSession.timestamp)}
                        </div>
                        <Separator orientation="vertical" className="h-3" />
                        <div className="flex items-center">
                          <MessageSquare className="h-3 w-3 mr-1" />
                          {chatSession.messageCount}
                        </div>
                      </div>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger>
                        <MoreHorizontal className="h-4 w-4" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => onDelete(chatSession.id)}
                        >
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
