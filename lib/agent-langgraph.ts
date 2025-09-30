import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { prisma } from "./prisma";
import { findSimilarChunks, generateEmbedding } from "./embeddings";
import {
  DocumentGenerator,
  DocumentGenerationOptions,
} from "./document-generator";

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
   * Node: Generate AI response based on query and context
   */
  private async generateResponseNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    try {
      const messages = [
        new SystemMessage(`You are a helpful AI assistant that can analyze documents and answer questions based on the provided context.

You can also generate documents when requested. If the user asks you to create, generate, or write a document, report, analysis, or any structured content, please provide the complete content in your response.

IMPORTANT: When generating documents for PDF output, you MUST format your response as HTML with proper structure. Use HTML tags like <h1>, <h2>, <p>, <ul>, <li>, <table>, etc. to structure the content properly. This is required for PDF generation.

${
  state.context
    ? `Context from documents:
${state.context}

Please use this context to answer the user's question. If the context doesn't contain relevant information, you can provide a general response but mention that you don't have specific information from the documents.`
    : "No document context available. Please provide a helpful general response."
}

When generating documents, please:
1. Provide complete, well-structured HTML content
2. Use appropriate HTML formatting and organization
3. Include relevant details and information
4. Make the content professional and comprehensive
5. Format as HTML for PDF generation compatibility
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
   * Node: Decide whether to generate a document based on AI response analysis
   */
  private async decideDocumentGenerationNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    try {
      console.log("Deciding whether to generate document...");

      if (!this.llm) {
        console.error("LLM not initialized");
        return { shouldGenerateDoc: false };
      }

      const prompt = `Based on the following AI response, determine if a document should be generated.
      
      AI Response: ${state.aiResponse}
      
      Generate a document if the response contains:
      - Structured information that would benefit from formatting (reports, summaries, lists)
      - Data that could be presented in a table or organized format
      - Content that the user might want to save or share
      
      Do NOT generate a document for:
      - Simple conversational responses
      - Short answers or confirmations
      - Error messages or clarifications
      
      Respond with only "yes" or "no".`;

      const decision = await this.llm.invoke(prompt);
      const shouldGenerate = decision.content
        .toString()
        .toLowerCase()
        .includes("yes");

      console.log(
        `Document generation decision: ${shouldGenerate ? "yes" : "no"}`
      );

      return { shouldGenerateDoc: shouldGenerate };
    } catch (error) {
      console.error("Error in document generation decision:", error);
      return { shouldGenerateDoc: false };
    }
  }

  /**
   * Conditional function to determine next node based on document generation decision
   */
  private shouldGenerateDocument(state: AgentState): string {
    return state.shouldGenerateDoc ? "generateDocument" : "saveConversation";
  }

  /**
   * Node: Generate document file based on AI response
   */
  private async generateDocumentNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    try {
      const documentGenerator = new DocumentGenerator();

      // Ensure the content is properly formatted HTML
      let htmlContent = state.aiResponse;
      if (!htmlContent.includes("<html>") && !htmlContent.includes("<body>")) {
        htmlContent = `
          <html>
            <head>
              <title>AI Generated Document</title>
              <style>
                body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
                h1, h2, h3 { color: #333; }
                p { margin-bottom: 10px; }
              </style>
            </head>
            <body>
              ${htmlContent}
            </body>
          </html>
        `;
      }

      const buffer = await documentGenerator.generatePDF({
        format: "pdf",
        content: htmlContent,
        title: "AI Generated Document",
      });

      return {
        documentFile: {
          buffer,
          filename: "ai-generated-document.pdf",
          mimeType: "application/pdf",
        },
      };
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
