import { useEffect, useRef, useState } from "react";
import ChatComposer from "./chat-composer";
import ChatMessagesRich from "./chat-messages-rich";
import { Message } from "@/app/dashboard/chat/page";
import { DocumentItem } from "../file-dialog";
import SpeechRecognition, {
  useSpeechRecognition,
} from "react-speech-recognition";
import { toast } from "sonner";

const ChatContainer = () => {
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isLoadingMessages = false;
  const isLoadingSessions = false;

  // Chat state
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [items, setItems] = useState<DocumentItem[]>([]);
  const [showFileUpload, setShowFileUpload] = useState(false);
  const [selectedreferencedDocs, setSelectedreferencedDocs] = useState<
    { name: string; url: string }[]
  >([]);

  const toggleDocumentSelection = (doc: DocumentItem) => {
    setItems((prev) =>
      prev.some((d) => d.id === doc.id)
        ? prev.filter((d) => d.id !== doc.id)
        : [...prev, doc]
    );
  };

  // Speech recognition refs/state
  const [isRecording, setIsRecording] = useState(false);
  const {
    transcript,
    listening,
    resetTranscript,
    browserSupportsSpeechRecognition,
    interimTranscript,
    finalTranscript,
  } = useSpeechRecognition();
  const supportsSpeech =
    typeof window !== "undefined" && Boolean(browserSupportsSpeechRecognition);

  // Reflect listening state onto our local UI state
  useEffect(() => {
    setIsRecording(listening);
  }, [listening]);

  // Auto-send when a final transcript is available; update input for interim
  useEffect(() => {
    const finalText = (finalTranscript as unknown as string) || "";
    if (finalText && finalText.trim().length > 0) {
      // sendMessage(finalText.trim());
      resetTranscript();
      return;
    }
    const interim =
      (interimTranscript as unknown as string) || transcript || "";
    if (interim && interim.trim().length > 0) {
      setInput(interim.trim());
    }
  }, [finalTranscript, interimTranscript, transcript]);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Speech recording controls
  const ensureMicPermission = async (): Promise<boolean> => {
    if (!navigator?.mediaDevices?.getUserMedia) return true; // skip preflight if unavailable
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      return true;
    } catch (err: any) {
      const name = err?.name || "";
      if (name === "NotAllowedError" || name === "SecurityError") {
        toast.error(
          "Akses mikrofon ditolak. Izinkan mikrofon lalu reload halaman."
        );
      } else if (name === "NotFoundError") {
        toast.error("Perangkat mikrofon tidak ditemukan.");
      } else {
        toast.error("Tidak bisa mengakses mikrofon.");
      }
      return false;
    }
  };

  const startRecording = async () => {
    if (!supportsSpeech) {
      toast.error("Browser tidak mendukung speech recognition.");
      return;
    }
    const ok = await ensureMicPermission();
    if (!ok) return;
    try {
      await SpeechRecognition.startListening({
        continuous: false,
        language: "id-ID",
      });
    } catch (e) {
      console.warn("Failed to start recognition:", e);
      toast.error("Tidak bisa mulai rekam.");
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    try {
      SpeechRecognition.stopListening();
    } catch {}
    setIsRecording(false);
  };

  const toggleRecording = () => {
    if (listening) stopRecording();
    else startRecording();
  };

  const sendMessage = async (overrideContent?: string) => {};

  return (
    <div className="h-[calc(100vh-74px)] flex flex-col">
      {/* Messages */}
      <ChatMessagesRich
        ref={scrollAreaRef as any}
        messages={messages as any}
        isLoadingMessages={isLoadingMessages}
        isLoadingSessions={isLoadingSessions}
      />

      {/* Input Area */}
      <ChatComposer
        items={items}
        setItems={setItems}
        setSelectedreferencedDocs={setSelectedreferencedDocs}
        toggleDocumentSelection={toggleDocumentSelection}
        textareaRef={textareaRef}
        input={input}
        setInput={setInput}
        handleKeyPress={handleKeyPress}
        isLoading={isLoading}
        isRecording={isRecording}
        toggleRecording={toggleRecording}
        supportsSpeech={supportsSpeech}
        sendMessage={sendMessage}
        note={false}
        filePicker={false}
      />
    </div>
  );
};

export default ChatContainer;
