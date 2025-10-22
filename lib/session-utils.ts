import { prisma } from '@/lib/prisma';

export interface DocumentSessionOptions {
  documentId: string;
  userId: string;
  type?: string;
  title?: string;
}

/**
 * Get or create a chat session for a specific document
 * If a session already exists for the document, return it
 * Otherwise, create a new session
 */
export async function getOrCreateDocumentSession(options: DocumentSessionOptions) {
  const { documentId, userId, type = 'document-chat', title } = options;

  // First, try to find an existing session for this document
  const existingSession = await prisma.chatSession.findFirst({
    where: {
      documentId,
      userId,
      type,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  if (existingSession) {
    return existingSession;
  }

  // If no session exists, get the document name for the title
  const document = await prisma.item.findFirst({
    where: {
      id: documentId,
      userId,
      type: 'document',
    },
  });

  if (!document) {
    throw new Error('Document not found or access denied');
  }

  // Create a new session
  const newSession = await prisma.chatSession.create({
    data: {
      title: title || `Chat: ${document.name}`,
      userId,
      documentId,
      type,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
  });

  return newSession;
}

/**
 * Get all sessions for a specific document
 */
export async function getDocumentSessions(documentId: string, userId: string) {
  return await prisma.chatSession.findMany({
    where: {
      documentId,
      userId,
    },
    include: {
      messages: {
        orderBy: { createdAt: 'asc' },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });
}