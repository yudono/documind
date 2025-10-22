import Groq from "groq-sdk";
import { documentAgent } from "./agent-langgraph";

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
});

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content:
    | string
    | Array<{
        type: "text" | "image_url";
        text?: string;
        image_url?: {
          url: string;
        };
      }>;
}

export interface ChatCompletionOptions {
  model?: string;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  stream?: boolean;
}

/**
 * Generate chat completion using Groq (original function for backward compatibility)
 */
export async function generateChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  try {
    const {
      model = "llama-3.3-70b-versatile",
      temperature = 0.7,
      max_tokens = 1024,
      top_p = 1,
      stream = false,
    } = options;

    const completion = await groq.chat.completions.create({
      model,
      messages: messages as any,
      temperature,
      max_completion_tokens: max_tokens,
      top_p,
      stream: false, // Ensure we get a non-streaming response
    });

    // Type assertion to handle the union type
    const chatCompletion = completion as any;
    return (
      chatCompletion.choices[0]?.message?.content || "No response generated"
    );
  } catch (error) {
    console.error("Error generating chat completion:", error);
    throw new Error("Failed to generate AI response");
  }
}

/**
 * Enhanced chat completion with agent integration for document generation
 */
export async function generateChatCompletionWithAgent(
  messages: ChatMessage[],
  options: ChatCompletionOptions & {
    userId?: string;
    sessionId?: string;
    useSemanticSearch?: boolean;
    documentIds?: string[];
    conversationContext?: string;
    documentUrls?: string[];
  } = {}
): Promise<
  | string
  | { response: string; referencedDocuments: string[]; documentFile?: any }
> {
  try {
    // Extract the user query from messages (typically the last user message)
    const userMessage = messages.filter((msg) => msg.role === "user").pop();
    const query =
      userMessage && typeof userMessage.content === "string"
        ? userMessage.content
        : userMessage && Array.isArray(userMessage.content)
        ? userMessage.content.find((c) => c.type === "text")?.text || ""
        : "";

    // Always use the agent for processing - let the agent decide whether to generate documents
    if (options.userId) {
      const agentResult = await documentAgent.processQuery({
        query,
        userId: options.userId,
        sessionId: options.sessionId,
        useSemanticSearch: options.useSemanticSearch || false,
        documentIds: options.documentIds,
        conversationContext: options.conversationContext,
        documentUrls: options.documentUrls,
      });

      return agentResult;
    }

    // Fallback to basic chat completion if no userId provided
    return await generateChatCompletion(messages, options);
  } catch (error) {
    console.error("Error generating enhanced chat completion:", error);
    throw new Error("Failed to generate AI response");
  }
}

function resolveAbsoluteUrl(inputUrl: string): string {
  try {
    // If already absolute and valid
    const u = new URL(inputUrl);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return u.toString();
    }
  } catch {}
  // Try to resolve against environment base URLs
  const bases = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.NEXTAUTH_URL,
    process.env.NEXTAPP_URL,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : undefined,
  ].filter(Boolean) as string[];
  for (const base of bases) {
    try {
      const u = new URL(inputUrl, base);
      if (u.protocol === "http:" || u.protocol === "https:") {
        return u.toString();
      }
    } catch {}
  }
  throw new Error("Invalid URL: must be absolute http/https");
}

/**
 * Perform OCR on an image or PDF
 */
export async function performOCR(
  imageUrl: string,
  prompt: string = "Extract all text from this image. Provide the text content in a clear, structured format."
): Promise<string> {
  try {
    const url = resolveAbsoluteUrl(imageUrl);
    const pathname = new URL(url).pathname;

    // Try to detect content type via HEAD; fall back to extension
    let contentType: string | null = null;
    try {
      const head = await fetch(url, { method: "HEAD" });
      if (head.ok) {
        contentType = head.headers.get("content-type");
      }
    } catch {}

    const isPdfByPath = /\.pdf($|\?)/i.test(pathname);
    const isPdfByType = contentType ? /pdf/i.test(contentType) : false;

    // If the URL points to a PDF, parse with pdf-parse instead of vision model
    if (isPdfByPath || isPdfByType) {
      try {
        const res = await fetch(url);
        if (!res.ok) {
          throw new Error(
            `Failed to fetch PDF: ${res.status} ${res.statusText}`
          );
        }
        const arrayBuffer = await res.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);
        const pdfParse = (await import("pdf-parse")).default;
        const parsed = await pdfParse(buffer);
        const text = parsed?.text || "";
        return text.trim() || "No text extracted";
      } catch (err) {
        console.error("PDF parse error:", err);
        throw new Error("Failed to extract text from PDF");
      }
    }

    // If content-type exists and is not image, bail
    if (contentType && !/^image\//i.test(contentType)) {
      throw new Error(`Unsupported content-type for OCR: ${contentType}`);
    }

    const messages: ChatMessage[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
          },
          {
            type: "image_url",
            image_url: {
              url,
            },
          },
        ],
      },
    ];

    const completion = await groq.chat.completions.create({
      model: "meta-llama/llama-4-maverick-17b-128e-instruct", // Vision model for OCR
      messages: messages as any,
      temperature: 0.1, // Lower temperature for more accurate OCR
      max_completion_tokens: 2048,
      top_p: 1,
      stream: false,
    });

    // Type assertion to handle the union type
    const chatCompletion = completion as any;
    return chatCompletion.choices[0]?.message?.content || "No text extracted";
  } catch (error) {
    console.error("Error performing OCR:", error);
    throw new Error("Failed to extract text from image");
  }
}

/**
 * Analyze document content and generate insights
 */
export async function analyzeDocument(
  content: string,
  analysisType: "summary" | "key_points" | "questions" | "custom" = "summary",
  customPrompt?: string
): Promise<string> {
  try {
    let systemPrompt = "";
    let userPrompt = "";

    switch (analysisType) {
      case "summary":
        systemPrompt =
          "You are a document analysis expert. Provide clear, concise summaries of documents.";
        userPrompt = `Please provide a comprehensive summary of the following document content:\n\n${content}`;
        break;
      case "key_points":
        systemPrompt =
          "You are a document analysis expert. Extract key points and important information from documents.";
        userPrompt = `Please extract the key points and important information from the following document:\n\n${content}`;
        break;
      case "questions":
        systemPrompt =
          "You are a document analysis expert. Generate relevant questions based on document content.";
        userPrompt = `Based on the following document content, generate relevant questions that could help with understanding or further exploration:\n\n${content}`;
        break;
      case "custom":
        systemPrompt = "You are a helpful document analysis assistant.";
        userPrompt =
          customPrompt ||
          `Analyze the following document content:\n\n${content}`;
        break;
    }

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ];

    return await generateChatCompletion(messages, {
      temperature: 0.3,
      max_tokens: 1500,
    });
  } catch (error) {
    console.error("Error analyzing document:", error);
    throw new Error("Failed to analyze document");
  }
}

/**
 * Generate document based on template and user input
 */
export async function generateDocument(
  templateType: string,
  formData: Record<string, any>,
  additionalInstructions?: string
): Promise<string> {
  try {
    const fileType = formData.fileType || "pdf";

    // File type specific prompts and formatting
    const getFileTypePrompt = (type: string) => {
      switch (type) {
        case "pdf":
          return `Create a professional PDF-style document with proper headings, sections, and formatting. Use clear structure with titles, subtitles, and well-organized content. Include executive summary, main content sections, and conclusion where appropriate.`;
        case "docx":
          return `Create a Microsoft Word-style document with proper formatting. Use headings (H1, H2, H3), bullet points, numbered lists, and professional layout. Structure the content with clear sections and subsections.`;
        case "xlsx":
          return `Create spreadsheet-style content with tabular data, calculations, and structured information. Present data in rows and columns format with headers, totals, and relevant formulas where applicable. Include data analysis and summaries.`;
        default:
          return `Create a well-formatted professional document with proper structure and organization.`;
      }
    };

    const systemPrompt = `You are a professional document generator specializing in ${fileType.toUpperCase()} documents. ${getFileTypePrompt(
      fileType
    )} Ensure the document is complete, properly structured, and ready for professional use.`;

    const userPrompt = `Generate a ${templateType} document in ${fileType.toUpperCase()} format using the following information:
    
${Object.entries(formData)
  .filter(([key]) => key !== "fileType")
  .map(([key, value]) => `${key}: ${value}`)
  .join("\n")}

${
  additionalInstructions
    ? `Additional instructions: ${additionalInstructions}`
    : ""
}

Please create a complete, professional ${fileType.toUpperCase()} document that includes all necessary sections, proper formatting, and is suitable for ${
      fileType === "xlsx"
        ? "data analysis and spreadsheet use"
        : "professional presentation and distribution"
    }.

${
  fileType === "xlsx"
    ? "Format the content as structured data with clear headers, rows, and columns. Include calculations, totals, and data analysis where relevant."
    : ""
}
${
  fileType === "docx"
    ? "Use proper document structure with headings, subheadings, bullet points, and professional formatting."
    : ""
}
${
  fileType === "pdf"
    ? "Create content suitable for PDF format with clear sections, professional layout, and comprehensive information."
    : ""
}`;

    const messages: ChatMessage[] = [
      {
        role: "system",
        content: systemPrompt,
      },
      {
        role: "user",
        content: userPrompt,
      },
    ];

    return await generateChatCompletion(messages, {
      temperature: 0.2,
      max_tokens: 3000, // Increased for more comprehensive documents
    });
  } catch (error) {
    console.error("Error generating document:", error);
    throw new Error("Failed to generate document");
  }
}

export async function generateChatWithAgent(
  query: string,
  userId: string,
  sessionId?: string,
  useSemanticSearch: boolean = false,
  documentIds?: string[],
  conversationContext?: string,
  documentUrls?: string[]
): Promise<{
  response: string;
  referencedDocuments: string[];
  documentFile?: any;
}> {
  try {
    return await documentAgent.processQuery({
      query,
      userId,
      sessionId,
      useSemanticSearch,
      documentIds,
      conversationContext,
      documentUrls,
    });
  } catch (error) {
    console.error("Error generating chat with agent:", error);
    throw error;
  }
}

export { groq };
