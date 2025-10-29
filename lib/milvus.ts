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
  timestamp?: number;
  metadata?: Record<string, any>;
}

interface SearchResult {
  id: string;
  documentId: string;
  chunkText: string;
  chunkIndex: number;
  similarity: number;
  timestamp?: number;
  metadata?: Record<string, any>;
}

class MilvusService {
  private client: MilvusClient | null = null;
  private collectionName: string = "document_embeddings";
  private isConnected: boolean = false;
  private config: MilvusConfig;
  private hasTimestampField: boolean = false;

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
    } catch (error: any) {
      console.error("Failed to connect to Milvus:", error);

      // Check for protobuf loading errors common in serverless environments
      if (
        error?.message?.includes("Unable to load service") ||
        error?.message?.includes("milvus.proto") ||
        error?.message?.includes("protobuf") ||
        error?.message?.includes("grpc")
      ) {
        console.error(
          "Milvus protobuf/gRPC loading error detected - this is common in serverless environments"
        );
        throw new Error(
          "Milvus protobuf loading failed in serverless environment"
        );
      }

      throw new Error("Milvus connection failed");
    }
  }

  private async updateFieldPresence(): Promise<void> {
    try {
      const desc: any = await (this.client as any).describeCollection({
        collection_name: this.collectionName,
      });
      const fields: any[] = desc.schema?.fields || desc.fields || [];
      this.hasTimestampField = fields.some((f: any) => f.name === "timestamp");
    } catch (e) {
      // If describe fails, assume timestamp not present to be safe
      this.hasTimestampField = false;
      console.warn(
        "describeCollection failed, assuming no timestamp field:",
        e
      );
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
        await this.updateFieldPresence();
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
          {
            name: "timestamp",
            description: "Insertion time (ms since epoch)",
            data_type: DataType.Int64,
          },
        ],
      } as any;

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

      // Newly created collection surely has timestamp
      this.hasTimestampField = true;

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
      const data = chunks.map((chunk) => {
        const base: any = {
          id: chunk.id,
          document_id: chunk.documentId,
          chunk_text: chunk.chunkText,
          chunk_index: chunk.chunkIndex,
          embedding: chunk.embedding,
          user_id: userId,
        };
        if (this.hasTimestampField) {
          base.timestamp = chunk.timestamp ?? Date.now();
        }
        return base;
      });

      await this.client!.insert({
        collection_name: this.collectionName,
        data,
      });

      // Ensure newly inserted data is queryable immediately
      if ((this.client as any).flush) {
        await (this.client as any).flush({
          collection_names: [this.collectionName],
        });
      }
      await this.client!.loadCollection({
        collection_name: this.collectionName,
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

    // Batch processing to reduce memory footprint and avoid long single inserts
    const ts = Date.now();
    const batchInsertSize = 64; // number of chunks per insert call
    const embedConcurrency = 3; // limit embedding generation parallelism
    let totalInserted = 0;

    for (let start = 0; start < chunks.length; start += batchInsertSize) {
      const slice = chunks.slice(start, start + batchInsertSize);

      // Generate embeddings for this batch with limited concurrency
      const embeddings: Array<number[] | null> = await this.mapWithConcurrency(
        slice,
        embedConcurrency,
        async (chunk, idx) => {
          try {
            const emb = await this.generateEmbeddingForText(chunk);
            return emb;
          } catch (error) {
            console.error(
              `Error generating embedding for chunk ${start + idx}:`,
              error
            );
            return null; // Skip failed embeddings but continue
          }
        }
      );

      const batchChunks: DocumentChunk[] = [];
      for (let j = 0; j < slice.length; j++) {
        const emb = embeddings[j];
        if (!emb) continue;
        const globalIndex = start + j;
        batchChunks.push({
          id: `${documentId}_${ts}_${globalIndex}`,
          documentId,
          chunkText: slice[j],
          chunkIndex: globalIndex,
          embedding: emb,
          timestamp: ts,
        });
      }

      if (batchChunks.length > 0) {
        await this.insertDocumentChunks(batchChunks, userId);
        totalInserted += batchChunks.length;
      }
    }

    return { chunksCount: totalInserted };
  }

  private async generateEmbeddingForText(text: string): Promise<number[]> {
    // Use OpenAI's text-embedding-3-small model via the embeddings module
    return await generateEmbedding(text);
  }

  // Utility: Map with limited concurrency
  private async mapWithConcurrency<T, R>(
    items: T[],
    concurrency: number,
    mapper: (item: T, index: number) => Promise<R>
  ): Promise<R[]> {
    const results: R[] = new Array(items.length) as any;
    let idx = 0;

    const workers = new Array(Math.max(1, concurrency))
      .fill(0)
      .map(async () => {
        while (true) {
          const current = idx++;
          if (current >= items.length) break;
          results[current] = await mapper(items[current], current);
        }
      });
    await Promise.all(workers);
    return results;
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
      await this.client!.loadCollection({
        collection_name: this.collectionName,
      });

      // Build filter expression
      let expr = `user_id == "${userId}"`;
      if (documentIds && documentIds.length > 0) {
        const docFilter = documentIds.map((id) => `"${id}"`).join(", ");
        expr += ` && document_id in [${docFilter}]`;
      }

      const outputFields = ["id", "document_id", "chunk_text", "chunk_index"];
      if (this.hasTimestampField) outputFields.push("timestamp");

      const searchParams = {
        collection_name: this.collectionName,
        vectors: [queryEmbedding],
        search_params: {
          anns_field: "embedding",
          topk: limit,
          metric_type: MetricType.COSINE,
          params: { nprobe: 10 },
        },
        output_fields: outputFields,
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
        timestamp: result.timestamp,
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

  async getChunksByDocumentId(
    documentId: string,
    userId: string,
    limit: number = 10
  ): Promise<SearchResult[]> {
    if (!this.isConnected) {
      await this.connect();
    }

    try {
      await this.client!.loadCollection({
        collection_name: this.collectionName,
      });
      const filter = `document_id == "${documentId}" && user_id == "${userId}"`;
      const rawLimit = Math.max(limit * 3, 30);
      const outputFields = ["id", "document_id", "chunk_text", "chunk_index"];
      if (this.hasTimestampField) outputFields.push("timestamp");
      const result: any = await (this.client as any).query({
        collection_name: this.collectionName,
        output_fields: outputFields,
        filter,
        limit: rawLimit,
      });

      const rows: any[] = (result?.data || []) as any[];
      if (this.hasTimestampField) {
        rows.sort((a, b) => {
          const diffTs = (b.timestamp ?? 0) - (a.timestamp ?? 0);
          if (diffTs !== 0) return diffTs;
          return (a.chunk_index ?? 0) - (b.chunk_index ?? 0);
        });
      } else {
        rows.sort((a, b) => (a.chunk_index ?? 0) - (b.chunk_index ?? 0));
      }

      const sliced = rows.slice(0, limit);

      return sliced.map((r) => ({
        id: r.id,
        documentId: r.document_id,
        chunkText: r.chunk_text,
        chunkIndex: r.chunk_index,
        similarity: 0,
        timestamp: r.timestamp,
      }));
    } catch (error) {
      console.error("Error querying chunks by documentId:", error);
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
