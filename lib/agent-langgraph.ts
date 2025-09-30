import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { prisma } from "./prisma";
import { findSimilarChunks, generateEmbedding } from "./embeddings";
import {
  DocumentGenerator,
  DocumentGenerationOptions,
} from "./document-generator";
import { mdToPdf } from "md-to-pdf";

// Define the state annotation for the graph
const AgentStateAnnotation = Annotation.Root({
  query: Annotation<string>,
  userId: Annotation<string>,
  sessionId: Annotation<string | undefined>,
  useSemanticSearch: Annotation<boolean>,
  documentIds: Annotation<string[] | undefined>,
  conversationContext: Annotation<string | undefined>,
  context: Annotation<string>,
  referencedDocuments: Annotation<string[]>,
  aiResponse: Annotation<string>,
  documentFile: Annotation<
    { buffer: Buffer; filename: string; mimeType: string } | undefined
  >,
  finalResponse: Annotation<string>,
  shouldGenerateDoc: Annotation<boolean>,
  documentType: Annotation<"pdf" | "xlsx" | "docx" | "pptx" | undefined>,
});

type AgentState = typeof AgentStateAnnotation.State;

// Input interface for the agent
interface AgentInput {
  query: string;
  userId: string;
  sessionId?: string;
  useSemanticSearch: boolean;
  documentIds?: string[];
  conversationContext?: string;
}

// Output interface for the agent
interface AgentOutput {
  response: string;
  referencedDocuments: string[];
  documentFile?: { buffer: Buffer; filename: string; mimeType: string };
}

export class LangGraphDocumentAgent {
  private llm: ChatGroq;
  private graph: any;

  constructor() {
    this.llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: "llama-3.3-70b-versatile",
      temperature: 0.7,
    });

    this.buildGraph();
  }

  private buildGraph() {
    // Bind methods to preserve 'this' context
    const retrieveContextNode = this.retrieveContextNode.bind(this);
    const generateResponseNode = this.generateResponseNode.bind(this);
    const decideDocumentGenerationNode =
      this.decideDocumentGenerationNode.bind(this);
    const generateDocumentNode = this.generateDocumentNode.bind(this);
    const saveConversationNode = this.saveConversationNode.bind(this);
    const shouldGenerateDocument = this.shouldGenerateDocument.bind(this);

    const workflow = new StateGraph(AgentStateAnnotation)
      .addNode("retrieveContext", retrieveContextNode)
      .addNode("generateResponse", generateResponseNode)
      .addNode("decideDocumentGeneration", decideDocumentGenerationNode)
      .addNode("generateDocument", generateDocumentNode)
      .addNode("saveConversation", saveConversationNode)
      .addEdge(START, "retrieveContext")
      .addEdge("retrieveContext", "generateResponse")
      .addEdge("generateResponse", "decideDocumentGeneration")
      .addConditionalEdges("decideDocumentGeneration", shouldGenerateDocument, {
        generateDocument: "generateDocument",
        saveConversation: "saveConversation",
      })
      .addEdge("generateDocument", "saveConversation")
      .addEdge("saveConversation", END);

    this.graph = workflow.compile();
    return this.graph;
  }

  /**
   * Node: Retrieve context from documents using semantic search
   */
  private async retrieveContextNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    let context = "";
    let referencedDocuments: string[] = [];

    if (state.useSemanticSearch) {
      try {
        // Generate embedding for the query
        const queryEmbedding = await generateEmbedding(state.query);

        // Get document embeddings from database
        const whereClause: any = {
          document: {
            userId: state.userId,
          },
        };

        if (state.documentIds && state.documentIds.length > 0) {
          whereClause.documentId = {
            in: state.documentIds,
          };
        }

        const documentEmbeddings = await prisma.documentEmbedding.findMany({
          where: whereClause,
          include: {
            document: {
              select: {
                id: true,
                name: true,
                type: true,
              },
            },
          },
        });

        // Transform embeddings to match the expected format
        const formattedEmbeddings = documentEmbeddings.map((embedding) => ({
          id: embedding.id,
          embedding: embedding.embedding,
          text: embedding.chunkText,
          documentId: embedding.documentId,
        }));

        // Find similar chunks
        const similarChunks = findSimilarChunks(
          queryEmbedding,
          formattedEmbeddings,
          5,
          0.5
        );

        // Build context from similar chunks
        context = similarChunks.map((chunk) => chunk.text).join("\n\n");

        // Get referenced document IDs
        referencedDocuments = Array.from(
          new Set(similarChunks.map((chunk) => chunk.documentId))
        );
      } catch (error) {
        console.error("Error retrieving context:", error);
      }
    }

    // Add conversation context if provided
    if (state.conversationContext) {
      context = state.conversationContext + (context ? "\n\n" + context : "");
    }

    return {
      context,
      referencedDocuments,
    };
  }

  /**
   * Node: Generate AI response based on query and context with document type awareness
   */
  private async generateResponseNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    try {
      const messages = [
        new SystemMessage(`You are a helpful AI assistant that can analyze documents and answer questions based on the provided context.

You can also generate documents when requested. If the user asks you to create, generate, or write a document, report, analysis, or any structured content, please provide the complete content in your response.

IMPORTANT DOCUMENT FORMATTING GUIDELINES:
- For PDF documents: Format your response in Markdown with proper structure using # ## ### for headings, bullet points, tables, etc.
- For Excel/XLSX documents: Structure data in tabular format with clear headers, rows, and columns. Include calculations and summaries where appropriate.
- For Word/DOCX documents: Format your response in Markdown with clear headings, paragraphs, lists, and professional formatting.
- For PowerPoint/PPTX documents: Format your response in Markdown organized for slide presentation with clear sections and bullet points.

${
  state.context
    ? `Context from documents:
${state.context}

Please use this context to answer the user's question. If the context doesn't contain relevant information, you can provide a general response but mention that you don't have specific information from the documents.`
    : "No document context available. Please provide a helpful general response."
}

When generating documents, please:
1. Provide complete, well-structured content appropriate for the document type
2. Use proper formatting and organization
3. Include relevant details and information
4. Make the content professional and comprehensive
5. Consider the specific format requirements for the document type
`),
        new HumanMessage(state.query),
      ];

      const response = await this.llm.invoke(messages);
      const aiResponse = response.content as string;

      return {
        aiResponse,
        finalResponse: aiResponse,
      };
    } catch (error) {
      console.error("Error generating response:", error);
      throw new Error("Failed to generate response");
    }
  }

  /**
   * Node: Decide whether to generate a document and determine document type
   */
  private async decideDocumentGenerationNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    try {
      console.log("Deciding whether to generate document...");

      if (!this.llm) {
        console.error("LLM not initialized");
        return { shouldGenerateDoc: false, documentType: undefined };
      }

      // First, decide if a document should be generated
      const decisionPrompt = `Based on the following user query and AI response, determine if a document should be generated.
      
      User Query: ${state.query}
      AI Response: ${state.aiResponse}
      
      Generate a document if:
      - The user explicitly requests document creation (e.g., "create a report", "generate a document", "make a presentation")
      - The response contains structured information that would benefit from formatting
      - The content includes data that could be presented in tables, charts, or organized format
      - The user asks for something to be saved, exported, or shared
      
      Do NOT generate a document for:
      - Simple conversational responses or questions
      - Short answers or confirmations
      - Error messages or clarifications
      - General information requests without document creation intent
      
      Respond with only "yes" or "no".`;

      const decision = await this.llm.invoke(decisionPrompt);
      const shouldGenerate = decision.content
        .toString()
        .toLowerCase()
        .includes("yes");

      console.log(
        `Document generation decision: ${shouldGenerate ? "yes" : "no"}`
      );

      if (!shouldGenerate) {
        return { shouldGenerateDoc: false, documentType: undefined };
      }

      // If document should be generated, determine the type
      const typePrompt = `Based on the user query and content, determine the most appropriate document type:

      User Query: ${state.query}
      AI Response: ${state.aiResponse}

      Choose the best document type:
      - "pdf": For reports, articles, formal documents, text-heavy content, or when user specifically mentions PDF
      - "xlsx": For data analysis, tables, calculations, spreadsheets, financial reports, or when user mentions Excel/spreadsheet
      - "docx": For formal documents, letters, proposals, structured text documents, or when user mentions Word document
      - "pptx": For presentations, slide decks, visual content, or when user mentions PowerPoint/presentation

      Consider these keywords:
      - PDF: report, document, article, formal, text, analysis
      - XLSX: data, table, spreadsheet, calculation, numbers, Excel, financial, budget
      - DOCX: letter, proposal, document, Word, formal text, contract
      - PPTX: presentation, slides, PowerPoint, deck, visual, meeting

      Respond with only one of: pdf, xlsx, docx, pptx`;

      const typeDecision = await this.llm.invoke(typePrompt);
      const documentType = typeDecision.content
        .toString()
        .toLowerCase()
        .trim() as "pdf" | "xlsx" | "docx" | "pptx";

      // Validate the document type
      const validTypes = ["pdf", "xlsx", "docx", "pptx"];
      const finalDocumentType = validTypes.includes(documentType)
        ? documentType
        : "pdf";

      console.log(`Document type decision: ${finalDocumentType}`);

      return {
        shouldGenerateDoc: true,
        documentType: finalDocumentType,
      };
    } catch (error) {
      console.error("Error in document generation decision:", error);
      return { shouldGenerateDoc: false, documentType: undefined };
    }
  }

  /**
   * Conditional function to determine next node based on document generation decision
   */
  private shouldGenerateDocument(state: AgentState): string {
    return state.shouldGenerateDoc ? "generateDocument" : "saveConversation";
  }

  /**
   * Generate PDF document using @mohtasham/md-to-docx package (as PDF alternative)
   */
  private async generatePDFDocument(
    content: string,
    title: string
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    // Enhanced system prompt for PDF generation
    const pdfPrompt = `Transform the following content into well-structured Markdown suitable for PDF generation:

Content: ${content}

Requirements:
- Use proper Markdown structure with # ## ### for headings
- Use bullet points (-) and numbered lists (1.)
- Use tables with | syntax for tabular data
- Include proper spacing and formatting
- Make it professional and readable
- Ensure content is complete and well-organized

Provide only the Markdown content (no explanations):`;

    const markdownResponse = await this.llm.invoke(pdfPrompt);
    let markdownContent = markdownResponse.content as string;

    // Configure options for PDF generation
    const pdf_options = {
      pdf_options: {
        format: "A4" as const,
        margin: {
          top: "20mm",
          right: "20mm",
          bottom: "20mm",
          left: "20mm",
        },
        printBackground: true,
        displayHeaderFooter: false,
      },
      stylesheet: [],
      marked_options: {
        highlight: null,
      },
    };

    // Convert markdown to PDF
    const pdf = await mdToPdf({ content: markdownContent }, pdf_options);

    return {
      buffer: pdf.content,
      filename: `${title.replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
      mimeType: "application/pdf",
    };
  }

  /**
   * Generate Excel document with structured data
   */
  private async generateExcelDocument(
    content: string,
    title: string
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const documentGenerator = new DocumentGenerator();

    // Enhanced system prompt for Excel generation
    const excelPrompt = `Transform the following content into structured data suitable for Excel generation:

Content: ${content}

Requirements:
- Extract or create tabular data with clear headers
- Include calculations, totals, or summaries where appropriate
- Organize data logically in rows and columns
- If no tabular data exists, create a structured format
- Include data analysis or insights

Provide the data in JSON format with this structure:
{
  "title": "Sheet Title",
  "headers": ["Column1", "Column2", "Column3"],
  "data": [
    {"Column1": "value1", "Column2": "value2", "Column3": "value3"},
    {"Column1": "value4", "Column2": "value5", "Column3": "value6"}
  ]
}

Provide only the JSON (no explanations):`;

    const excelResponse = await this.llm.invoke(excelPrompt);
    let excelData;

    try {
      excelData = JSON.parse(excelResponse.content as string);
    } catch (error) {
      // Fallback to simple data structure
      excelData = {
        title: title,
        headers: ["Item", "Description", "Value"],
        data: [
          {
            Item: "Generated Content",
            Description: content.substring(0, 100),
            Value: "AI Generated",
          },
        ],
      };
    }

    const buffer = await documentGenerator.generateExcel({
      format: "excel",
      content: content,
      title: excelData.title || title,
      data: excelData.data || [],
    });

    return {
      buffer,
      filename: `${title.replace(/[^a-zA-Z0-9]/g, "_")}.xlsx`,
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    };
  }

  /**
   * Generate DOCX document with Markdown to DOCX conversion
   */
  private async generateDOCXDocument(
    content: string,
    title: string
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const { convertMarkdownToDocx } = await import("@mohtasham/md-to-docx");

    // Enhanced system prompt for DOCX generation with markdown formatting
    const docxPrompt = `Transform the following content into well-structured Markdown suitable for Word document generation:

Content: ${content}

Requirements:
- Use proper Markdown structure with # ## ### #### ##### for headings (H1-H5)
- Use bullet points (-) and numbered lists (1.) where appropriate
- Include proper paragraph breaks with double line breaks
- Make it professional and document-style
- Organize content with clear sections and subsections
- Use **bold** and *italic* formatting where appropriate
- Include tables using Markdown table syntax when presenting tabular data
- Use > for blockquotes when highlighting important information
- Use \`code\` for inline code or technical terms
- Use \`\`\`language blocks for code snippets
- Add [TOC] at the beginning if the document has multiple sections
- Use \\pagebreak to separate major sections if needed

Provide only the Markdown content (no explanations):`;

    const markdownResponse = await this.llm.invoke(docxPrompt);
    let markdownContent = markdownResponse.content as string;

    // Configure options for professional document styling
    const options = {
      documentType: "document" as const,
      style: {
        titleSize: 32,
        headingSpacing: 240,
        paragraphSpacing: 200,
        lineSpacing: 1.15,
        heading1Size: 28,
        heading2Size: 24,
        heading3Size: 20,
        heading4Size: 18,
        heading5Size: 16,
        paragraphSize: 12,
        listItemSize: 12,
        codeBlockSize: 10,
        blockquoteSize: 12,
        tocFontSize: 14,
        paragraphAlignment: "JUSTIFIED" as const,
        blockquoteAlignment: "LEFT" as const,
        direction: "LTR" as const,
      },
    };

    // Convert markdown to DOCX
    const blob = await convertMarkdownToDocx(markdownContent, options);

    // Convert blob to buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      buffer,
      filename: `${title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`,
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  /**
   * Generate PPTX document using @mohtasham/md-to-docx package
   */
  private async generatePPTXDocument(
    content: string,
    title: string
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    const { convertMarkdownToDocx } = await import("@mohtasham/md-to-docx");

    // Enhanced system prompt for PPTX-style content (presentation format)
    const pptxPrompt = `Transform the following content into well-structured presentation content suitable for slides:

Content: ${content}

Requirements:
- Create clear, concise sections that would work well as slides
- Use headings for slide titles
- Use bullet points and numbered lists for key information
- Keep content presentation-friendly and easy to read
- Include introduction and conclusion sections if appropriate
- Make it professional and presentation-style
- Use markdown formatting (headings, lists, emphasis)

Format the content as structured markdown that would translate well to presentation slides.

Provide only the Markdown content (no explanations):`;

    const markdownResponse = await this.llm.invoke(pptxPrompt);
    let markdownContent = markdownResponse.content as string;

    // Configure options for presentation-style document
    const options = {
      documentType: "document" as const,
      style: {
        titleSize: 36,
        headingSpacing: 300,
        paragraphSpacing: 240,
        lineSpacing: 1.5,
        heading1Size: 32,
        heading2Size: 28,
        heading3Size: 24,
        heading4Size: 20,
        heading5Size: 18,
        paragraphSize: 14,
        listItemSize: 14,
        codeBlockSize: 12,
        blockquoteSize: 14,
        tocFontSize: 16,
        paragraphAlignment: "LEFT" as const,
        blockquoteAlignment: "LEFT" as const,
        direction: "LTR" as const,
      },
    };

    // Convert markdown to DOCX (presentation-style formatting)
    const blob = await convertMarkdownToDocx(markdownContent, options);

    // Convert blob to buffer
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    return {
      buffer,
      filename: `${title.replace(/[^a-zA-Z0-9]/g, "_")}.docx`,
      mimeType:
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    };
  }

  /**
   * Node: Generate document file based on AI response and document type
   */
  private async generateDocumentNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    try {
      const title = "AI Generated Document";
      const documentType = state.documentType || "pdf";

      console.log(`Generating ${documentType.toUpperCase()} document...`);

      let documentFile;

      switch (documentType) {
        case "pdf":
          documentFile = await this.generatePDFDocument(
            state.aiResponse,
            title
          );
          break;
        case "xlsx":
          documentFile = await this.generateExcelDocument(
            state.aiResponse,
            title
          );
          break;
        case "docx":
          documentFile = await this.generateDOCXDocument(
            state.aiResponse,
            title
          );
          break;
        case "pptx":
          documentFile = await this.generatePPTXDocument(
            state.aiResponse,
            title
          );
          break;
        default:
          // Fallback to PDF
          documentFile = await this.generatePDFDocument(
            state.aiResponse,
            title
          );
      }

      console.log(
        `Successfully generated ${documentType.toUpperCase()} document: ${
          documentFile.filename
        }`
      );

      return { documentFile };
    } catch (error) {
      console.error("Error generating document:", error);
      return {};
    }
  }

  /**
   * Node: Save conversation to database
   */
  private async saveConversationNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    if (!state.sessionId) {
      return {};
    }

    try {
      // Save user message
      await prisma.chatMessage.create({
        data: {
          content: state.query,
          role: "user",
          sessionId: state.sessionId,
          referencedDocs: state.referencedDocuments,
        },
      });

      // Save assistant message
      await prisma.chatMessage.create({
        data: {
          content: state.finalResponse,
          role: "assistant",
          sessionId: state.sessionId,
          referencedDocs: state.referencedDocuments,
        },
      });
    } catch (error) {
      console.error("Error saving conversation:", error);
      // Don't throw error here to avoid breaking the response flow
    }

    return {};
  }

  /**
   * Process a query using the LangGraph workflow
   */
  async processQuery(input: AgentInput): Promise<AgentOutput> {
    try {
      // Initialize state
      const initialState: AgentState = {
        query: input.query,
        userId: input.userId,
        sessionId: input.sessionId,
        useSemanticSearch: input.useSemanticSearch,
        documentIds: input.documentIds,
        conversationContext: input.conversationContext,
        context: "",
        referencedDocuments: [],
        aiResponse: "",
        documentFile: undefined,
        finalResponse: "",
        shouldGenerateDoc: false,
        documentType: undefined,
      };

      // Run the graph
      const result = await this.graph.invoke(initialState);

      return {
        response: result.finalResponse,
        referencedDocuments: result.referencedDocuments,
        documentFile: result.documentFile,
      };
    } catch (error) {
      console.error("Error processing query:", error);
      throw new Error("Failed to process query");
    }
  }
}

// Export a singleton instance
export const documentAgent = new LangGraphDocumentAgent();
