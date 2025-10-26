import { MilvusClient, DataType, MetricType } from "@zilliz/milvus2-sdk-node";
import { generateEmbedding } from "./embeddings";

interface MilvusConfig {
  address: string;
  token: string;
  database?: string;
}

interface DocumentChunk {
  id: string;
  documentId: string;
  chunkText: string;
  chunkIndex: number;
  embedding: number[];
  metadata?: Record<string, any>;
}

interface SearchResult {
  id: string;
  documentId: string;
  chunkText: string;
  chunkIndex: number;
  similarity: number;
  metadata?: Record<string, any>;
}

class MilvusService {
  private client: MilvusClient | null = null;
  private collectionName: string = "document_embeddings";
  private isConnected: boolean = false;
  private config: MilvusConfig;

  constructor(config: MilvusConfig) {
    this.config = config;
  }

  async connect(): Promise<void> {
    try {
      if (!this.client) {
        this.client = new MilvusClient({
          address: this.config.address,
          token: this.config.token,
          database: this.config.database || "default",
        });
      }
      // Test connection
      await this.client.checkHealth();
      this.isConnected = true;
      console.log("Connected to Milvus Cloud successfully");
    } catch (error) {
      console.error("Failed to connect to Milvus:", error);
      throw new Error("Milvus connection failed");
    }
  }

  async createCollection(): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // Check if collection exists
      const hasCollection = await this.client!.hasCollection({
        collection_name: this.collectionName,
      });

      if (hasCollection.value) {
        console.log(`Collection ${this.collectionName} already exists`);
        await this.client!.loadCollection({
          collection_name: this.collectionName,
        });
        return;
      }

      // Create collection schema
      const schema = {
        collection_name: this.collectionName,
        description: "Document embeddings for semantic search",
        fields: [
          {
            name: "id",
            description: "Primary key",
            data_type: DataType.VarChar,
            max_length: 100,
            is_primary_key: true,
          },
          {
            name: "document_id",
            description: "Document ID",
            data_type: DataType.VarChar,
            max_length: 100,
          },
          {
            name: "chunk_text",
            description: "Text chunk content",
            data_type: DataType.VarChar,
            max_length: 65535,
          },
          {
            name: "chunk_index",
            description: "Chunk index in document",
            data_type: DataType.Int64,
          },
          {
            name: "embedding",
            description: "Text embedding vector",
            data_type: DataType.FloatVector,
            dim: 384, // all-MiniLM-L6-v2 dimension
          },
          {
            name: "user_id",
            description: "User ID for access control",
            data_type: DataType.VarChar,
            max_length: 100,
          },
        ],
      };

      await this.client!.createCollection(schema);

      // Create index for vector field
      await this.client!.createIndex({
        collection_name: this.collectionName,
        field_name: "embedding",
        index_type: "IVF_FLAT",
        metric_type: MetricType.COSINE,
        params: { nlist: 1024 },
      });

      // Load collection
      await this.client!.loadCollection({
        collection_name: this.collectionName,
      });

      console.log(`Collection ${this.collectionName} created successfully`);
    } catch (error) {
      console.error("Error creating collection:", error);
      throw new Error("Failed to create Milvus collection");
    }
  }

  async insertDocumentChunks(
    chunks: DocumentChunk[],
    userId: string
  ): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const data = chunks.map((chunk) => ({
        id: chunk.id,
        document_id: chunk.documentId,
        chunk_text: chunk.chunkText,
        chunk_index: chunk.chunkIndex,
        embedding: chunk.embedding,
        user_id: userId,
      }));

      await this.client!.insert({
        collection_name: this.collectionName,
        data,
      });

      console.log(`Inserted ${chunks.length} chunks into Milvus`);
    } catch (error) {
      console.error("Error inserting chunks:", error);
      throw new Error("Failed to insert document chunks");
    }
  }

  async processAndInsertDocument(
    documentId: string,
    text: string,
    userId: string,
    chunkSize: number = 1000,
    overlap: number = 200
  ): Promise<{ chunksCount: number }> {
    // Split text into chunks (simple implementation)
    const chunks = this.splitTextIntoChunks(text, chunkSize, overlap);

    if (chunks.length === 0) {
      throw new Error("No valid text chunks found");
    }

    // Generate embeddings and create document chunks
    const documentChunks: DocumentChunk[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      try {
        const embedding = await this.generateEmbeddingForText(chunk);

        documentChunks.push({
          id: `${documentId}_chunk_${i}`,
          documentId,
          chunkText: chunk,
          chunkIndex: i,
          embedding,
        });
      } catch (error) {
        console.error(`Error generating embedding for chunk ${i}:`, error);
        // Continue with other chunks even if one fails
      }
    }

    // Insert chunks into Milvus
    await this.insertDocumentChunks(documentChunks, userId);

    return { chunksCount: documentChunks.length };
  }

  private splitTextIntoChunks(
    text: string,
    chunkSize: number = 1000,
    overlap: number = 200
  ): string[] {
    const chunks: string[] = [];
    const words = text.split(/\s+/);

    for (let i = 0; i < words.length; i += chunkSize - overlap) {
      const chunk = words.slice(i, i + chunkSize).join(" ");
      if (chunk.trim().length > 0) {
        chunks.push(chunk.trim());
      }
    }

    return chunks;
  }

  private async generateEmbeddingForText(text: string): Promise<number[]> {
    // Use OpenAI's text-embedding-3-small model via the embeddings module
    return await generateEmbedding(text);
  }

  private simpleHash(str: string): number {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash;
  }

  async searchSimilarChunks(
    queryEmbedding: number[],
    userId: string,
    limit: number = 10,
    documentIds?: string[]
  ): Promise<SearchResult[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      // Ensure collection is loaded before performing search
      await this.client!.loadCollection({ collection_name: this.collectionName });

      // Build filter expression
      let expr = `user_id == "${userId}"`;
      if (documentIds && documentIds.length > 0) {
        const docFilter = documentIds.map((id) => `"${id}"`).join(", ");
        expr += ` && document_id in [${docFilter}]`;
      }

      const searchParams = {
        collection_name: this.collectionName,
        vectors: [queryEmbedding],
        search_params: {
          anns_field: "embedding",
          topk: limit,
          metric_type: MetricType.COSINE,
          params: { nprobe: 10 },
        },
        output_fields: ["id", "document_id", "chunk_text", "chunk_index"],
        expr,
      } as any;

      const results = await this.client!.search(searchParams);

      if (!results.results || results.results.length === 0) {
        return [];
      }

      return results.results[0].map((result: any) => ({
        id: result.id,
        documentId: result.document_id,
        chunkText: result.chunk_text,
        chunkIndex: result.chunk_index,
        similarity: result.score,
      }));
    } catch (error) {
      console.error("Error searching similar chunks:", error);
      throw new Error("Failed to search similar chunks");
    }
  }

  async searchSimilarChunksByText(
    query: string,
    userId: string,
    limit: number = 10,
    documentIds?: string[]
  ): Promise<SearchResult[]> {
    try {
      // Generate embedding for the query text
      const queryEmbedding = await this.generateEmbeddingForText(query);

      // Use the existing searchSimilarChunks method
      return await this.searchSimilarChunks(
        queryEmbedding,
        userId,
        limit,
        documentIds
      );
    } catch (error) {
      console.error("Error searching similar chunks by text:", error);
      return [];
    }
  }

  async deleteDocumentChunks(
    documentId: string,
    userId: string
  ): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const expr = `document_id == "${documentId}" && user_id == "${userId}"`;

      await this.client!.delete({
        collection_name: this.collectionName,
        filter: expr,
      });

      console.log(`Deleted chunks for document ${documentId}`);
    } catch (error) {
      console.error("Error deleting document chunks:", error);
      throw new Error("Failed to delete document chunks");
    }
  }

  async deleteUserData(userId: string): Promise<void> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const expr = `user_id == "${userId}"`;

      await this.client!.delete({
        collection_name: this.collectionName,
        filter: expr,
      });

      console.log(`Deleted all data for user ${userId}`);
    } catch (error) {
      console.error("Error deleting user data:", error);
      throw new Error("Failed to delete user data");
    }
  }

  async getCollectionStats(): Promise<any> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      const stats = await this.client!.getCollectionStatistics({
        collection_name: this.collectionName,
      });
      return stats;
    } catch (error) {
      console.error("Error getting collection stats:", error);
      throw new Error("Failed to get collection statistics");
    }
  }

  // New: Fallback query to fetch chunks by documentId when semantic search returns none
  async getChunksByDocumentId(
    documentId: string,
    userId: string,
    limit: number = 10
  ): Promise<SearchResult[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.client!.loadCollection({ collection_name: this.collectionName });
      const filter = `document_id == "${documentId}" && user_id == "${userId}"`;
      const result: any = await (this.client as any).query({
        collection_name: this.collectionName,
        output_fields: ["id", "document_id", "chunk_text", "chunk_index"],
        filter,
        limit,
      });

      const rows: any[] = (result?.data || []) as any[];
      rows.sort((a, b) => (a.chunk_index ?? 0) - (b.chunk_index ?? 0));

      return rows.map((r) => ({
        id: r.id,
        documentId: r.document_id,
        chunkText: r.chunk_text,
        chunkIndex: r.chunk_index,
        similarity: 0,
      }));
    } catch (error) {
      console.error("Error querying chunks by documentId:", error);
      return [];
    }
  }

  async disconnect(): Promise<void> {
    if (this.isConnected) {
      // Note: The Milvus client doesn't have an explicit disconnect method
      // Connection will be closed when the process ends
      this.isConnected = false;
      console.log("Disconnected from Milvus");
    }
  }
}

// Create singleton instance
const milvusConfig: MilvusConfig = {
  address: process.env.MILVUS_ENDPOINT || "",
  token: process.env.MILVUS_TOKEN || "",
  database: process.env.MILVUS_DATABASE || "default",
};

// Only create the service if Milvus is configured
export const milvusService =
  milvusConfig.address && milvusConfig.token
    ? new MilvusService(milvusConfig)
    : null;

// Initialize collection on startup
let initPromise: Promise<void> | null = null;

export async function initializeMilvus(): Promise<void> {
  if (!milvusService) {
    console.warn("Milvus not configured - skipping initialization");
    return;
  }

  if (!initPromise) {
    initPromise = (async () => {
      try {
        await milvusService.connect();
        await milvusService.createCollection();
      } catch (error) {
        console.error("Failed to initialize Milvus:", error);
        throw error;
      }
    })();
  }
  return initPromise;
}

export { MilvusService };
export type { DocumentChunk, SearchResult, MilvusConfig };
