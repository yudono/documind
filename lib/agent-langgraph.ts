import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { prisma } from "./prisma";
import { findSimilarChunks, generateEmbedding } from "./embeddings";
import {
  DocumentGenerators,
  DocumentGenerationResult,
} from "./document-generators";

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
  documentFile: Annotation<DocumentGenerationResult | undefined>,
  finalResponse: Annotation<string>,
});

// Define the state interface for type safety
interface AgentState {
  query: string;
  userId: string;
  sessionId?: string;
  useSemanticSearch: boolean;
  documentIds?: string[];
  conversationContext?: string;
  context: string;
  referencedDocuments: string[];
  aiResponse: string;
  documentFile?: DocumentGenerationResult;
  finalResponse: string;
}

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
  documentFile?: DocumentGenerationResult;
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

    this.graph = this.buildGraph();
  }

  private buildGraph() {
    // Create the state graph using the annotation
    const workflow = new StateGraph(AgentStateAnnotation);

    // Add nodes
    workflow.addNode("retrieveContext", this.retrieveContextNode.bind(this));
    workflow.addNode("generateResponse", this.generateResponseNode.bind(this));
    workflow.addNode("generateDocument", this.generateDocumentNode.bind(this));
    workflow.addNode("saveConversation", this.saveConversationNode.bind(this));

    // Define the flow using START and END constants
    // Using type assertions to work around TypeScript limitations
    workflow.addEdge(START, "retrieveContext" as any);
    workflow.addEdge("retrieveContext" as any, "generateResponse" as any);
    workflow.addEdge("generateResponse" as any, "generateDocument" as any);
    workflow.addEdge("generateDocument" as any, "saveConversation" as any);
    workflow.addEdge("saveConversation" as any, END);

    return workflow.compile();
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

${
  state.context
    ? `Context from documents:
${state.context}

Please use this context to answer the user's question. If the context doesn't contain relevant information, you can provide a general response but mention that you don't have specific information from the documents.`
    : "No document context available. Please provide a helpful general response."
}

When generating documents, please:
1. Provide complete, well-structured content
2. Use appropriate formatting and organization
3. Include relevant details and information
4. Make the content professional and comprehensive
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
   * Node: Generate document file if AI response indicates document generation
   */
  private async generateDocumentNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    try {
      // Check if AI response indicates document generation
      const documentFile =
        await DocumentGenerators.generateDocumentFromAIResponse(
          state.aiResponse,
          "ai-generated-document"
        );

      return {
        documentFile: documentFile || undefined,
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
        finalResponse: "",
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
