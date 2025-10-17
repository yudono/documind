import { ChatGroq } from '@langchain/groq';
import { HumanMessage, SystemMessage, AIMessage } from '@langchain/core/messages';
import { prisma } from './prisma';
import { milvusService } from './milvus';
import { generateDocument } from './groq';

interface AgentInput {
  query: string;
  userId: string;
  sessionId?: string;
  useSemanticSearch: boolean;
  documentIds?: string[];
  conversationContext?: string;
}

interface AgentOutput {
  response: string;
  referencedDocuments: string[];
  documentFile?: {
    name: string;
    type: string;
    size: number;
    url: string;
    content: string;
    generatedAt: string;
  };
}

export class DocumentAgent {
  private llm: ChatGroq;

  constructor() {
    this.llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: 'llama-3.3-70b-versatile',
      temperature: 0.7,
    });
  }

  async processQuery(input: AgentInput): Promise<AgentOutput> {
    const { query, userId, sessionId, useSemanticSearch, documentIds, conversationContext } = input;
    
    // Step 1: Retrieve context if semantic search is enabled
    let context = '';
    let referencedDocuments: string[] = [];

    if (useSemanticSearch) {
      const contextResult = await this.retrieveContext(query, userId, documentIds);
      context = contextResult.context;
      referencedDocuments = contextResult.referencedDocuments;
    }

    // Step 2: Add conversation context if provided
    if (conversationContext) {
      context = conversationContext + (context ? '\n\n' + context : '');
    }

    // Step 3: Generate response with AI-driven document detection
    const response = await this.generateResponse(query, context);

    // Step 4: Save conversation if sessionId is provided
    if (sessionId) {
      await this.saveConversation(sessionId, query, response, referencedDocuments);
    }

    return {
      response,
      referencedDocuments
    };
  }

  private async retrieveContext(query: string, userId: string, documentIds?: string[]): Promise<{
    context: string;
    referencedDocuments: string[];
  }> {
    try {
      if (!milvusService) {
        console.warn('Milvus not configured - skipping context retrieval');
        return { context: '', referencedDocuments: [] };
      }
      
      // Use Milvus for semantic search
      const similarChunks = await milvusService.searchSimilarChunksByText(
        query,
        userId,
        5,
        documentIds
      );

      // Build context from similar chunks
      const context = similarChunks.map(chunk => chunk.chunkText).join('\n\n');

      // Get referenced document IDs
      const referencedDocumentIds = Array.from(new Set(similarChunks.map(chunk => chunk.documentId)));

      return {
        context,
        referencedDocuments: referencedDocumentIds
      };
    } catch (error) {
      console.error('Error retrieving context:', error);
      return {
        context: '',
        referencedDocuments: []
      };
    }
  }

  private async generateResponse(query: string, context: string): Promise<string> {
    try {
      const messages = [
        new SystemMessage(`You are a helpful AI assistant that can analyze documents and answer questions based on the provided context.

${context ? `Context from documents:
${context}

Please use this context to answer the user's question. If the context doesn't contain relevant information, you can provide a general response but mention that you don't have specific information from the documents.` : 'No document context available. Please provide a helpful general response.'}
`),
        new HumanMessage(query)
      ];

      const response = await this.llm.invoke(messages);
      
      return response.content as string;
    } catch (error) {
      console.error('Error generating response:', error);
      throw new Error('Failed to generate response');
    }
  }

  private async saveConversation(
    sessionId: string,
    query: string,
    response: string,
    referencedDocuments: string[]
  ): Promise<void> {
    try {
      // Save user message
      await prisma.chatMessage.create({
        data: {
          content: query,
          role: 'user',
          sessionId: sessionId,
          referencedDocs: referencedDocuments
        }
      });

      // Save assistant message
      await prisma.chatMessage.create({
        data: {
          content: response,
          role: 'assistant',
          sessionId: sessionId,
          referencedDocs: referencedDocuments
        }
      });
    } catch (error) {
      console.error('Error saving conversation:', error);
      // Don't throw error here to avoid breaking the response flow
    }
  }
}

// Export a singleton instance
export const documentAgent = new DocumentAgent();