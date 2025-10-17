import { z } from "zod";

// Schema definitions for different document formats
export const DocumentMetadataSchema = z.object({
  title: z.string(),
  author: z.string().optional(),
  subject: z.string().optional(),
  keywords: z.array(z.string()).optional(),
  createdAt: z.date().optional(),
  language: z.string().optional(),
});

export const TextElementSchema = z.object({
  type: z.literal("text"),
  content: z.string(),
  style: z
    .object({
      fontSize: z.number().optional(),
      fontWeight: z.enum(["normal", "bold"]).optional(),
      fontStyle: z.enum(["normal", "italic"]).optional(),
      color: z.string().optional(),
      alignment: z.enum(["left", "center", "right", "justify"]).optional(),
    })
    .optional(),
});

export const HeaderElementSchema = z.object({
  type: z.literal("header"),
  level: z.number().min(1).max(6),
  content: z.string(),
  style: z
    .object({
      fontSize: z.number().optional(),
      fontWeight: z.enum(["normal", "bold"]).optional(),
      color: z.string().optional(),
      alignment: z.enum(["left", "center", "right"]).optional(),
    })
    .optional(),
});

export const ListElementSchema = z.object({
  type: z.literal("list"),
  listType: z.enum(["ordered", "unordered"]),
  items: z.array(z.string()),
  style: z
    .object({
      fontSize: z.number().optional(),
      indentation: z.number().optional(),
      bulletStyle: z.string().optional(),
    })
    .optional(),
});

export const TableElementSchema = z.object({
  type: z.literal("table"),
  title: z.string().optional(),
  headers: z.array(z.string()),
  rows: z.array(z.array(z.string())),
  style: z
    .object({
      fontSize: z.number().optional(),
      headerStyle: z
        .object({
          backgroundColor: z.string().optional(),
          fontWeight: z.enum(["normal", "bold"]).optional(),
        })
        .optional(),
      borderStyle: z.string().optional(),
      cellPadding: z.number().optional(),
    })
    .optional(),
});

export const ImageElementSchema = z.object({
  type: z.literal("image"),
  src: z.string(),
  alt: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  alignment: z.enum(["left", "center", "right"]).optional(),
});

export const SpacerElementSchema = z.object({
  type: z.literal("spacer"),
  height: z.number(),
});

export const PageBreakElementSchema = z.object({
  type: z.literal("pageBreak"),
});

export const DocumentElementSchema = z.discriminatedUnion("type", [
  TextElementSchema,
  HeaderElementSchema,
  ListElementSchema,
  TableElementSchema,
  ImageElementSchema,
  SpacerElementSchema,
  PageBreakElementSchema,
]);

export const ParsedDocumentSchema = z.object({
  metadata: DocumentMetadataSchema,
  elements: z.array(DocumentElementSchema),
});

export type DocumentMetadata = z.infer<typeof DocumentMetadataSchema>;
export type TextElement = z.infer<typeof TextElementSchema>;
export type HeaderElement = z.infer<typeof HeaderElementSchema>;
export type ListElement = z.infer<typeof ListElementSchema>;
export type TableElement = z.infer<typeof TableElementSchema>;
export type ImageElement = z.infer<typeof ImageElementSchema>;
export type SpacerElement = z.infer<typeof SpacerElementSchema>;
export type PageBreakElement = z.infer<typeof PageBreakElementSchema>;
export type DocumentElement = z.infer<typeof DocumentElementSchema>;
export type ParsedDocument = z.infer<typeof ParsedDocumentSchema>;

export interface ParsingOptions {
  preserveFormatting?: boolean;
  extractTables?: boolean;
  extractLists?: boolean;
  extractImages?: boolean;
  defaultFontSize?: number;
  defaultAlignment?: "left" | "center" | "right";
}

export class DocumentFormatParser {
  private options: ParsingOptions;

  constructor(options: ParsingOptions = {}) {
    this.options = {
      preserveFormatting: true,
      extractTables: true,
      extractLists: true,
      extractImages: false,
      defaultFontSize: 12,
      defaultAlignment: "left",
      ...options,
    };
  }

  /**
   * Parse markdown-formatted text into structured document elements
   */
  parseMarkdown(
    content: string,
    metadata?: Partial<DocumentMetadata>
  ): ParsedDocument {
    const lines = content.split("\n");
    const elements: DocumentElement[] = [];

    let currentListItems: string[] = [];
    let currentListType: "ordered" | "unordered" | null = null;
    let currentTableHeaders: string[] = [];
    let currentTableRows: string[][] = [];
    let inTable = false;

    const flushList = () => {
      if (currentListItems.length > 0 && currentListType) {
        elements.push({
          type: "list",
          listType: currentListType,
          items: [...currentListItems],
          style: {
            fontSize: this.options.defaultFontSize,
          },
        });
        currentListItems = [];
        currentListType = null;
      }
    };

    const flushTable = () => {
      if (currentTableHeaders.length > 0 && currentTableRows.length > 0) {
        elements.push({
          type: "table",
          headers: [...currentTableHeaders],
          rows: [...currentTableRows],
          style: {
            fontSize: this.options.defaultFontSize,
            headerStyle: {
              fontWeight: "bold",
            },
          },
        });
        currentTableHeaders = [];
        currentTableRows = [];
        inTable = false;
      }
    };

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmedLine = line.trim();

      // Skip empty lines
      if (!trimmedLine) {
        flushList();
        flushTable();
        continue;
      }

      // Parse headers (# ## ### etc.)
      const headerMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        flushList();
        flushTable();

        const level = headerMatch[1].length;
        const content = headerMatch[2];

        elements.push({
          type: "header",
          level,
          content,
          style: {
            fontSize: this.options.defaultFontSize! + (7 - level) * 2,
            fontWeight: "bold",
            alignment: this.options.defaultAlignment,
          },
        });
        continue;
      }

      // Parse tables
      if (this.options.extractTables && trimmedLine.includes("|")) {
        const cells = trimmedLine
          .split("|")
          .map((cell) => cell.trim())
          .filter((cell) => cell);

        if (cells.length > 0) {
          if (!inTable) {
            // First row - headers
            currentTableHeaders = cells;
            inTable = true;
          } else if (!trimmedLine.includes("---")) {
            // Data row
            if (cells.length === currentTableHeaders.length) {
              currentTableRows.push(cells);
            }
          }
          continue;
        }
      } else if (inTable) {
        flushTable();
      }

      // Parse lists
      if (this.options.extractLists) {
        const unorderedMatch = trimmedLine.match(/^[-*+]\s+(.+)$/);
        const orderedMatch = trimmedLine.match(/^\d+\.\s+(.+)$/);

        if (unorderedMatch || orderedMatch) {
          const item = (unorderedMatch || orderedMatch)![1];
          const listType = unorderedMatch ? "unordered" : "ordered";

          if (currentListType !== listType) {
            flushList();
            currentListType = listType;
          }

          currentListItems.push(item);
          continue;
        } else if (currentListItems.length > 0) {
          flushList();
        }
      }

      // Parse page breaks
      if (trimmedLine === "---" || trimmedLine === "***") {
        flushList();
        flushTable();
        elements.push({ type: "pageBreak" });
        continue;
      }

      // Regular text
      if (trimmedLine) {
        flushList();
        flushTable();

        elements.push({
          type: "text",
          content: trimmedLine,
          style: {
            fontSize: this.options.defaultFontSize,
            fontWeight: "normal",
            alignment: this.options.defaultAlignment,
          },
        });
      }
    }

    // Flush any remaining items
    flushList();
    flushTable();

    const documentMetadata: DocumentMetadata = {
      title: metadata?.title || "Generated Document",
      author: metadata?.author || "Document Assistant",
      subject: metadata?.subject,
      keywords: metadata?.keywords,
      createdAt: metadata?.createdAt || new Date(),
      language: metadata?.language || "en",
    };

    return {
      metadata: documentMetadata,
      elements,
    };
  }

  /**
   * Parse JSON-formatted document structure
   */
  parseJSON(jsonContent: string): ParsedDocument {
    try {
      const parsed = JSON.parse(jsonContent);
      return ParsedDocumentSchema.parse(parsed);
    } catch (error) {
      throw new Error(
        `Failed to parse JSON document: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  /**
   * Parse plain text into basic document structure
   */
  parsePlainText(
    content: string,
    metadata?: Partial<DocumentMetadata>
  ): ParsedDocument {
    const lines = content.split("\n").filter((line) => line.trim());
    const elements: DocumentElement[] = [];

    // Use first line as title if no title provided
    let title = metadata?.title;
    let startIndex = 0;

    if (!title && lines.length > 0) {
      title = lines[0];
      startIndex = 1;

      elements.push({
        type: "header",
        level: 1,
        content: title,
        style: {
          fontSize: this.options.defaultFontSize! + 6,
          fontWeight: "bold",
          alignment: "center",
        },
      });
    }

    // Convert remaining lines to text elements
    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line) {
        elements.push({
          type: "text",
          content: line,
          style: {
            fontSize: this.options.defaultFontSize,
            fontWeight: "normal",
            alignment: this.options.defaultAlignment,
          },
        });
      }
    }

    const documentMetadata: DocumentMetadata = {
      title: title || "Generated Document",
      author: metadata?.author || "Document Assistant",
      subject: metadata?.subject,
      keywords: metadata?.keywords,
      createdAt: metadata?.createdAt || new Date(),
      language: metadata?.language || "en",
    };

    return {
      metadata: documentMetadata,
      elements,
    };
  }

  /**
   * Auto-detect format and parse accordingly
   */
  parse(content: string, metadata?: Partial<DocumentMetadata>): ParsedDocument {
    const trimmedContent = content.trim();

    // Try JSON first
    if (trimmedContent.startsWith("{") && trimmedContent.endsWith("}")) {
      try {
        return this.parseJSON(content);
      } catch {
        // Fall through to other parsers
      }
    }

    // Check for markdown indicators
    if (this.hasMarkdownIndicators(content)) {
      return this.parseMarkdown(content, metadata);
    }

    // Default to plain text
    return this.parsePlainText(content, metadata);
  }

  private hasMarkdownIndicators(content: string): boolean {
    const markdownPatterns = [
      /^#{1,6}\s+/m, // Headers
      /^\s*[-*+]\s+/m, // Unordered lists
      /^\s*\d+\.\s+/m, // Ordered lists
      /\|.*\|/m, // Tables
      /\*\*.*\*\*/, // Bold
      /\*.*\*/, // Italic
      /`.*`/, // Code
    ];

    return markdownPatterns.some((pattern) => pattern.test(content));
  }

  /**
   * Validate parsed document structure
   */
  validate(document: any): ParsedDocument {
    return ParsedDocumentSchema.parse(document);
  }

  /**
   * Convert parsed document back to markdown
   */
  toMarkdown(document: ParsedDocument): string {
    let markdown = "";

    for (const element of document.elements) {
      switch (element.type) {
        case "header":
          markdown += `${"#".repeat(element.level)} ${element.content}\n\n`;
          break;

        case "text":
          markdown += `${element.content}\n\n`;
          break;

        case "list":
          element.items.forEach((item, index) => {
            const bullet =
              element.listType === "ordered" ? `${index + 1}.` : "-";
            markdown += `${bullet} ${item}\n`;
          });
          markdown += "\n";
          break;

        case "table":
          if (element.title) {
            markdown += `### ${element.title}\n\n`;
          }

          // Headers
          markdown += `| ${element.headers.join(" | ")} |\n`;
          markdown += `| ${element.headers.map(() => "---").join(" | ")} |\n`;

          // Rows
          element.rows.forEach((row) => {
            markdown += `| ${row.join(" | ")} |\n`;
          });
          markdown += "\n";
          break;

        case "pageBreak":
          markdown += "---\n\n";
          break;

        case "spacer":
          markdown += "\n".repeat(Math.ceil(element.height / 10));
          break;
      }
    }

    return markdown.trim();
  }
}

export const documentFormatParser = new DocumentFormatParser();
