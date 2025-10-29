import { pipeline, env } from "@xenova/transformers";
import { mkdirSync, existsSync } from "fs";
import { join } from "path";

// Configure for serverless environments
env.allowLocalModels = false;

// Set cache directory to /tmp for serverless environments (writable directory)
const cacheDir = "/tmp/.cache/transformers";
env.cacheDir = cacheDir;

// Also set environment variables as fallback
process.env.TRANSFORMERS_CACHE = cacheDir;
process.env.HF_HOME = "/tmp/.cache";

// Ensure cache directory exists
try {
  if (!existsSync(cacheDir)) {
    mkdirSync(cacheDir, { recursive: true });
  }
} catch (error) {
  console.warn("Could not create transformers cache directory:", error);
}

let embeddingPipeline: any = null;

// Initialize the embedding pipeline with a self-hosted model
async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    try {
      embeddingPipeline = await pipeline(
        "feature-extraction",
        "Xenova/all-MiniLM-L6-v2",
        {
          revision: "main",
          quantized: true,
        }
      );
    } catch (error) {
      console.error("Error initializing embedding pipeline:", error);
      throw new Error("Failed to initialize embedding model");
    }
  }
  return embeddingPipeline;
}

// Generate embeddings for text using self-hosted model
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error("Text cannot be empty");
    }

    const pipeline = await getEmbeddingPipeline();
    const result = await pipeline(text, {
      pooling: "mean",
      normalize: true,
    });

    // Convert tensor to array
    const embedding = Array.from(result.data) as number[];
    return embedding;
  } catch (error) {
    console.error("Error generating embedding:", error);
    throw new Error("Failed to generate embedding");
  }
}

// Calculate cosine similarity between two embeddings (kept for chat embeddings functionality)
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error("Embeddings must have the same length");
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dotProduct / (normA * normB);
}
