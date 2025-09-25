import { pipeline, env } from '@xenova/transformers';

// Disable local model loading for serverless environments
env.allowLocalModels = false;

let embeddingPipeline: any = null;

// Initialize the embedding pipeline
async function getEmbeddingPipeline() {
  if (!embeddingPipeline) {
    try {
      embeddingPipeline = await pipeline(
        'feature-extraction',
        'Xenova/all-MiniLM-L6-v2',
        { 
          revision: 'main',
          quantized: true,
        }
      );
    } catch (error) {
      console.error('Error initializing embedding pipeline:', error);
      throw new Error('Failed to initialize embedding model');
    }
  }
  return embeddingPipeline;
}

// Generate embeddings for text
export async function generateEmbedding(text: string): Promise<number[]> {
  try {
    if (!text || text.trim().length === 0) {
      throw new Error('Text cannot be empty');
    }

    const pipeline = await getEmbeddingPipeline();
    const result = await pipeline(text, {
      pooling: 'mean',
      normalize: true,
    });

    // Convert tensor to array
    const embedding = Array.from(result.data) as number[];
    return embedding;
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw new Error('Failed to generate embedding');
  }
}

// Split text into chunks for embedding
export function splitTextIntoChunks(text: string, maxChunkSize: number = 500, overlap: number = 50): string[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const chunks: string[] = [];
  let currentChunk = '';

  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    
    if (currentChunk.length + trimmedSentence.length + 1 <= maxChunkSize) {
      currentChunk += (currentChunk ? '. ' : '') + trimmedSentence;
    } else {
      if (currentChunk) {
        chunks.push(currentChunk + '.');
        
        // Create overlap by taking the last few words
        const words = currentChunk.split(' ');
        const overlapWords = words.slice(-Math.min(overlap, words.length));
        currentChunk = overlapWords.join(' ') + '. ' + trimmedSentence;
      } else {
        // If single sentence is too long, split by words
        const words = trimmedSentence.split(' ');
        for (let i = 0; i < words.length; i += maxChunkSize) {
          const chunk = words.slice(i, i + maxChunkSize).join(' ');
          chunks.push(chunk);
        }
        currentChunk = '';
      }
    }
  }

  if (currentChunk) {
    chunks.push(currentChunk + '.');
  }

  return chunks.filter(chunk => chunk.trim().length > 0);
}

// Calculate cosine similarity between two embeddings
export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    throw new Error('Embeddings must have the same length');
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

// Find most similar chunks to a query
export function findSimilarChunks(
  queryEmbedding: number[],
  documentEmbeddings: { id: string; embedding: number[]; text: string; documentId: string }[],
  topK: number = 5,
  threshold: number = 0.5
): { id: string; text: string; documentId: string; similarity: number }[] {
  const similarities = documentEmbeddings.map(doc => ({
    id: doc.id,
    text: doc.text,
    documentId: doc.documentId,
    similarity: cosineSimilarity(queryEmbedding, doc.embedding),
  }));

  return similarities
    .filter(item => item.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topK);
}