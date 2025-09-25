import { prisma } from './prisma';
import { generateEmbedding } from './embeddings';

/**
 * Generate and store embedding for a chat message
 */
export async function generateChatMessageEmbedding(messageId: string, content: string): Promise<void> {
  try {
    // Generate embedding for the message content
    const embedding = await generateEmbedding(content);
    
    // Store the embedding in the database
    await prisma.chatMessageEmbedding.create({
      data: {
        messageId,
        embedding,
      },
    });
  } catch (error) {
    console.error('Error generating chat message embedding:', error);
    // Don't throw error to avoid blocking message creation
  }
}

/**
 * Find similar messages in a chat session based on embedding similarity
 */
export async function findSimilarMessages(
  query: string,
  sessionId: string,
  limit: number = 5
): Promise<Array<{ messageId: string; content: string; role: string; similarity: number }>> {
  try {
    // Generate embedding for the query
    const queryEmbedding = await generateEmbedding(query);
    
    // Get all message embeddings for this session
    const messageEmbeddings = await prisma.chatMessageEmbedding.findMany({
      where: {
        message: {
          sessionId,
        },
      },
      include: {
        message: {
          select: {
            id: true,
            content: true,
            role: true,
          },
        },
      },
    });

    // Calculate similarities and sort
    const similarities = messageEmbeddings
      .map((item: any) => {
        const similarity = cosineSimilarity(queryEmbedding, item.embedding);
        return {
          messageId: item.message.id,
          content: item.message.content,
          role: item.message.role,
          similarity,
        };
      })
      .sort((a: any, b: any) => b.similarity - a.similarity)
      .slice(0, limit);

    return similarities;
  } catch (error) {
    console.error('Error finding similar messages:', error);
    return [];
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) return 0;
  
  const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
  const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
  const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
  
  if (magnitudeA === 0 || magnitudeB === 0) return 0;
  
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * Get conversation context from similar messages
 */
export async function getChatContext(
  query: string,
  sessionId: string,
  maxMessages: number = 3
): Promise<string> {
  try {
    const similarMessages = await findSimilarMessages(query, sessionId, maxMessages);
    
    if (similarMessages.length === 0) {
      return '';
    }

    // Format the context
    const contextLines = similarMessages.map(msg => 
      `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`
    );

    return `Previous conversation context:\n${contextLines.join('\n')}\n`;
  } catch (error) {
    console.error('Error getting chat context:', error);
    return '';
  }
}