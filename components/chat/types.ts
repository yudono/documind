export interface ChatMessage {
  id: string;
  content: string;
  role: "user" | "assistant";
  timestamp: Date;
  isTyping?: boolean;
  referencedDocs?: { name: string; url: string }[];
  documentFile?: {
    name: string;
    type: string;
    downloadUrl: string;
    url?: string;
    error?: string;
  };
}

export const formatTime = (date: Date) =>
  date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
