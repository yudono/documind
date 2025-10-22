"use client";

import React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Send } from "lucide-react";

export interface ChatInputProps {
  value: string;
  disabled?: boolean;
  onChange: (value: string) => void;
  onSend: () => void;
}

export function ChatInput({ value, disabled, onChange, onSend }: ChatInputProps) {
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <div className="p-4 border-t">
      <div className="flex space-x-2">
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Ask AI assistant..."
          onKeyPress={handleKeyPress}
          disabled={disabled}
        />
        <Button onClick={onSend} disabled={!value.trim() || disabled} size="sm">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}