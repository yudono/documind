import React from "react";
import { StateGraph, END, START, Annotation } from "@langchain/langgraph";
import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { prisma } from "./prisma";
import { milvusService, initializeMilvus } from "./milvus";
import {
  DocumentGenerator,
  DocumentGenerationOptions,
} from "./document-generator";
import ReactPDF from "@react-pdf/renderer";
import { Document, Page, Font } from "@react-pdf/renderer";
import Html from "react-pdf-html";
import { performOCR } from "./groq";
import { generateEmbedding } from "./embeddings";

// Safety limits for prompts and context to avoid oversized LLM requests
const MAX_QUERY_CHARS = 4000;
const MAX_CONTEXT_CHARS = 8000;
const MAX_SYSTEM_CHARS = 2500;
const MAX_EXCEL_CONTENT_CHARS = 6000;

function clampText(input: string | undefined, max: number): string {
  // Keep for safety in non-context fields; avoid using for context packing
  const text = (input || "").trim();
  if (text.length <= max) return text;
  return text.slice(0, max);
}

// Helper: pack multiple context segments without truncating individual segments
// Ensures diversity (doc-wise and time-wise) and prioritizes relevant conversation memory
type ContextSegment = {
  source: "conversation" | "doc" | "global" | "ocr";
  documentId?: string;
  text: string;
  similarity?: number;
  timestamp?: number;
  priorityBoost?: number; // optional manual boost
};

function normalizeRange(values: number[]): (v?: number) => number {
  const valid = values.filter((v) => typeof v === "number" && !isNaN(v));
  const min = valid.length ? Math.min(...valid) : 0;
  const max = valid.length ? Math.max(...valid) : 1;
  const span = Math.max(1, max - min);
  return (v?: number) => {
    if (typeof v !== "number" || isNaN(v)) return 0;
    return (v - min) / span;
  };
}

function packContextSegments(
  segments: ContextSegment[],
  maxChars: number
): string {
  if (!segments.length) return "";

  // Deduplicate by normalized text
  const norm = (t: string) => t.replace(/\s+/g, " ").trim().toLowerCase();
  const seen = new Set<string>();
  const deduped = segments.filter((s) => {
    const key = norm(s.text).slice(0, 512);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Compute normalization helpers
  const simNormalizer = normalizeRange(
    deduped.map((s) => (typeof s.similarity === "number" ? s.similarity! : 0))
  );
  const tsNormalizer = normalizeRange(
    deduped.map((s) => (typeof s.timestamp === "number" ? s.timestamp! : 0))
  );

  // Score: relevance + recency + source-aware boost
  const scored = deduped.map((s) => {
    const sim = simNormalizer(s.similarity);
    const rec = tsNormalizer(s.timestamp);
    const sourceBoost =
      s.source === "conversation" ? 0.15 : s.source === "ocr" ? 0.05 : 0;
    const manual = s.priorityBoost ?? 0;
    const score = 0.7 * sim + 0.25 * rec + sourceBoost + manual;
    return { ...s, score } as ContextSegment & { score: number };
  });

  // Fairness across time: compute median timestamp and enforce mix
  const timestamps = scored
    .map((s) => (typeof s.timestamp === "number" ? s.timestamp! : 0))
    .sort((a, b) => a - b);
  const medianTs = timestamps.length
    ? timestamps[Math.floor(timestamps.length / 2)]
    : 0;

  const recent: (ContextSegment & { score: number })[] = [];
  const older: (ContextSegment & { score: number })[] = [];
  scored.forEach((s) => {
    if ((s.timestamp ?? 0) >= medianTs) recent.push(s);
    else older.push(s);
  });

  recent.sort((a, b) => b.score - a.score);
  older.sort((a, b) => b.score - a.score);

  // Build packed content up to maxChars, keep segments intact
  const perDocLimit = 6;
  const docCount: Record<string, number> = {};
  const chosen: (ContextSegment & { score: number })[] = [];
  let total = 0;
  let iRecent = 0;
  let iOlder = 0;
  const targetOlderRatio = 0.4; // ensure older memory included

  while (
    total < maxChars &&
    (iRecent < recent.length || iOlder < older.length)
  ) {
    const currentOlderRatio = chosen.length
      ? chosen.filter((c) => (c.timestamp ?? 0) < medianTs).length /
        chosen.length
      : 0;
    const pickOlder =
      currentOlderRatio < targetOlderRatio && iOlder < older.length;
    const pool = pickOlder ? older : recent;
    const idx = pickOlder ? iOlder : iRecent;
    const cand = pool[idx];
    if (!cand) break;

    const docKey = cand.documentId || `${cand.source}`;
    const used = docCount[docKey] || 0;
    const fits = total + cand.text.length + 4 <= maxChars;
    if (used < perDocLimit && fits) {
      chosen.push(cand);
      docCount[docKey] = used + 1;
      total += cand.text.length + 4; // include separators
    }
    if (pickOlder) iOlder++;
    else iRecent++;
  }

  // Assemble with light labels to help the LLM
  const parts = chosen.map((c) => {
    const label =
      c.source === "conversation"
        ? "[Conversation]"
        : c.source === "ocr"
        ? "[OCR]"
        : c.source === "global"
        ? "[Global]"
        : `[Doc:${c.documentId || "unknown"}]`;
    return `${label}\n${c.text}`;
  });
  return parts.join("\n\n");
}

// Small utility: map with limited concurrency (used for OCR batching)
async function mapWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length) as any;
  let idx = 0;
  const workers = new Array(Math.max(1, concurrency)).fill(0).map(async () => {
    while (true) {
      const current = idx++;
      if (current >= items.length) break;
      results[current] = await mapper(items[current], current);
    }
  });
  await Promise.all(workers);
  return results;
}

// Helper: build conversation transcript from Prisma for a session (last 12 messages, capped)
async function buildConversationContextFromSession(
  sessionId: string
): Promise<string> {
  try {
    const messages = await prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: "asc" },
      select: { role: true, content: true },
    });
    const last = messages.slice(Math.max(0, messages.length - 12));
    const transcript = last
      .map((m) => `${m.role === "user" ? "User" : "Assistant"}: ${m.content}`)
      .join("\n");
    // Do not cap here; packing will handle max size without truncating segments
    return transcript;
  } catch (e) {
    console.warn("Failed to build conversation context in agent:", e);
    return "";
  }
}

// Helper: simpan satu entri memori (user/assistant) ke Milvus
async function saveMemoryEntry(
  userId: string,
  sessionId: string | undefined,
  role: "user" | "assistant" | "ocr",
  content: string
): Promise<void> {
  try {
    if (!milvusService || !sessionId) return;
    await initializeMilvus();

    const text = (content || "").trim();
    if (!text) return;

    // If content is long, save using chunked insertion
    if (text.length > 1500) {
      const labeled = `[${role.toUpperCase()}]` + "\n" + text;
      await milvusService.processAndInsertDocument(sessionId, labeled, userId);
      return;
    }

    // Otherwise, save as a single chunk
    const embedding = await generateEmbedding(text);
    const chunk = {
      id: `${sessionId}_${role}_${Date.now()}`,
      documentId: sessionId,
      chunkText: text,
      chunkIndex: role === "user" ? 0 : role === "assistant" ? 1 : 2,
      embedding,
      timestamp: Date.now(),
    };

    await milvusService.insertDocumentChunks([chunk], userId);
  } catch (err) {
    console.warn("Milvus memory save failed:", err);
  }
}

// Register Roboto font family using local TTF files
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: `${process.env.NEXTAPP_URL}/fonts/Roboto-Regular.ttf`,
      fontWeight: "normal",
    },
    {
      src: `${process.env.NEXTAPP_URL}/fonts/Roboto-Bold.ttf`,
      fontWeight: "bold",
    },
    {
      src: `${process.env.NEXTAPP_URL}/fonts/Roboto-Italic.ttf`,
      fontWeight: "normal",
      fontStyle: "italic",
    },
    {
      src: `${process.env.NEXTAPP_URL}/fonts/Roboto-BoldItalic.ttf`,
      fontWeight: "bold",
      fontStyle: "italic",
    },
  ],
});

// Define the state annotation for the graph
const AgentStateAnnotation = Annotation.Root({
  query: Annotation<string>,
  userId: Annotation<string>,
  sessionId: Annotation<string | undefined>,
  useSemanticSearch: Annotation<boolean>,
  documentIds: Annotation<string[] | undefined>,
  conversationContext: Annotation<string | undefined>,
  context: Annotation<string>,
  aiResponse: Annotation<string>,
  documentFile: Annotation<
    { buffer: Buffer; filename: string; mimeType: string } | undefined
  >,
  finalResponse: Annotation<string>,
  shouldGenerateDoc: Annotation<boolean>,
  documentType: Annotation<"pdf" | "xlsx" | "docx" | "pptx" | undefined>,
  // Add document URLs for OCR
  referencedDocs: Annotation<{ name: string; url: string }[] | undefined>,
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
  referencedDocs?: { name: string; url: string }[];
}

// Output interface for the agent
interface AgentOutput {
  response: string;
  referencedDocs: { name: string; url: string }[];
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
    // Milvus init is deferred to runtime calls where needed
  }

  private buildGraph() {
    // Bind methods to preserve 'this' context
    const retrieveContextNode = this.retrieveContextNode.bind(this);
    const generateResponseNode = this.generateResponseNode.bind(this);
    const generateDocumentResponseNode =
      this.generateDocumentResponseNode.bind(this);
    const decideDocumentGenerationNode =
      this.decideDocumentGenerationNode.bind(this);
    const generateDocumentNode = this.generateDocumentNode.bind(this);
    const saveConversationNode = this.saveConversationNode.bind(this);
    const shouldGenerateDocument = this.shouldGenerateDocument.bind(this);
    const ocrDocumentsNode = this.ocrDocumentsNode.bind(this);

    const workflow = new StateGraph(AgentStateAnnotation)
      .addNode("retrieveContext", retrieveContextNode)
      .addNode("ocrDocuments", ocrDocumentsNode)
      .addNode("generateResponse", generateResponseNode)
      .addNode("generateDocumentResponse", generateDocumentResponseNode)
      .addNode("decideDocumentGeneration", decideDocumentGenerationNode)
      .addNode("generateDocument", generateDocumentNode)
      .addNode("saveConversation", saveConversationNode)
      // Run OCR first so its text is in Milvus before retrieval
      .addEdge(START, "ocrDocuments")
      .addEdge("ocrDocuments", "retrieveContext")
      .addEdge("retrieveContext", "generateResponse")
      .addEdge("generateResponse", "decideDocumentGeneration")
      .addConditionalEdges("decideDocumentGeneration", shouldGenerateDocument, {
        generateDocumentResponse: "generateDocumentResponse",
        saveConversation: "saveConversation",
      })
      .addEdge("generateDocumentResponse", "generateDocument")
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
    const segments: ContextSegment[] = [];

    if (state.useSemanticSearch) {
      try {
        if (!milvusService) {
          console.warn("Milvus not configured - skipping context retrieval");
          // Still attempt to use conversationContext if present
          if (state.conversationContext) {
            segments.push({
              source: "conversation",
              documentId: state.sessionId,
              text: state.conversationContext,
              priorityBoost: 0.1,
            });
          }
          return {
            ...state,
            context: packContextSegments(segments, MAX_CONTEXT_CHARS),
          };
        }

        // Try init Milvus but fail gracefully
        try {
          await initializeMilvus();
        } catch (e) {
          console.warn("Milvus init failed, skipping semantic search:", e);
          return { ...state, context: "" };
        }

        // Determine primaryDocIds: prioritize referencedDocs, then explicit documentIds, lastly sessionId
        const referencedDocIds = (state.referencedDocs || [])
          .map((d: any) => {
            const direct = d?.id || d?.documentId || d?.key;
            if (direct) return direct;
            // Try parse id from URL like /api/items/{id}/download
            try {
              const u = new URL(d?.url || "", "http://localhost");
              const match = (u.pathname || "").match(
                /\/items\/(.+?)\/download/
              );
              return match && match[1] ? match[1] : undefined;
            } catch {
              return undefined;
            }
          })
          .filter(Boolean);
        const explicitDocIds =
          state.documentIds && state.documentIds.length
            ? state.documentIds
            : [];
        const primaryDocIds = referencedDocIds.length
          ? referencedDocIds
          : explicitDocIds.length
          ? explicitDocIds
          : state.sessionId
          ? [state.sessionId]
          : [];

        // Augment query with referenced doc names to improve recall
        const docNameHints = (state.referencedDocs || [])
          .map((d) => d?.name)
          .filter(Boolean)
          .join(" ");
        const retrievalQuery = [
          state.query,
          docNameHints,
          state.conversationContext,
        ]
          .filter((v) => v && v.trim().length)
          .join(" ");

        // Pilih satu dokumen saja agar konteks tidak bercampur
        let selectedDocId: string | undefined =
          primaryDocIds.length === 1 ? primaryDocIds[0] : undefined;

        // Jika banyak kandidat dokumen, pilih yang paling relevan (berdasarkan similarity/timestamp)
        if (!selectedDocId && primaryDocIds.length > 1) {
          try {
            const probe = await milvusService!.searchSimilarChunksByText(
              retrievalQuery,
              state.userId,
              6,
              primaryDocIds
            );
            if (probe && probe.length > 0) {
              const byDoc: Record<
                string,
                { count: number; maxTs: number; maxSim: number }
              > = {};
              probe.forEach((r: any) => {
                const id = r.documentId;
                const cur = byDoc[id] || { count: 0, maxTs: 0, maxSim: 0 };
                cur.count++;
                cur.maxTs = Math.max(cur.maxTs, r.timestamp ?? 0);
                cur.maxSim = Math.max(cur.maxSim, r.similarity ?? 0);
                byDoc[id] = cur;
              });
              selectedDocId = Object.entries(byDoc).sort((a: any, b: any) => {
                const sa = a[1];
                const sb = b[1];
                if (sb.maxSim !== sa.maxSim) return sb.maxSim - sa.maxSim;
                if (sb.maxTs !== sa.maxTs) return sb.maxTs - sa.maxTs;
                return sb.count - sa.count;
              })[0]?.[0];
            }
          } catch (err) {
            console.warn("Probe similarity failed:", err);
          }
        }

        // Jika masih belum bisa memilih, pilih berdasarkan dokumen dengan timestamp terbaru
        if (!selectedDocId && primaryDocIds.length > 1) {
          try {
            const stats = await Promise.all(
              primaryDocIds.map(async (id) => {
                try {
                  const r = await milvusService!.getChunksByDocumentId(
                    id,
                    state.userId,
                    1
                  );
                  const ts = r && r.length > 0 ? r[0].timestamp ?? 0 : 0;
                  return { id, ts };
                } catch {
                  return { id, ts: 0 };
                }
              })
            );
            selectedDocId = stats.sort((a, b) => b.ts - a.ts)[0]?.id;
          } catch (err) {
            console.warn("Select latest doc by timestamp failed:", err);
          }
        }

        // First, deterministically fetch chunks directly by selected documentId to avoid mixing contexts
        if (selectedDocId) {
          try {
            const directChunks = await milvusService!.getChunksByDocumentId(
              selectedDocId,
              state.userId,
              12
            );
            if (directChunks && directChunks.length > 0) {
              for (const c of directChunks) {
                segments.push({
                  source: "doc",
                  documentId: selectedDocId,
                  text: c.chunkText,
                  similarity: 0.5,
                  timestamp: (c as any).timestamp ?? 0,
                });
              }
            }
          } catch (err) {
            console.warn("Direct fetch by selected documentId failed:", err);
          }
        }

        // Next, semantic search restricted to selectedDocId; only run if no direct context found
        if (!segments.length) {
          const similarChunks = await milvusService!.searchSimilarChunksByText(
            retrievalQuery,
            state.userId,
            12,
            selectedDocId ? [selectedDocId] : undefined
          );

          if (similarChunks && similarChunks.length > 0) {
            // Jika tidak ada selectedDocId, pilih satu dokumen dari hasil global
            let finalDocId = selectedDocId;
            if (!finalDocId) {
              const byDoc: Record<
                string,
                { count: number; maxTs: number; maxSim: number }
              > = {};
              similarChunks.forEach((r: any) => {
                const id = r.documentId;
                const cur = byDoc[id] || { count: 0, maxTs: 0, maxSim: 0 };
                cur.count++;
                cur.maxTs = Math.max(cur.maxTs, r.timestamp ?? 0);
                cur.maxSim = Math.max(cur.maxSim, r.similarity ?? 0);
                byDoc[id] = cur;
              });
              finalDocId = Object.entries(byDoc).sort((a: any, b: any) => {
                const sa = a[1];
                const sb = b[1];
                if (sb.maxSim !== sa.maxSim) return sb.maxSim - sa.maxSim;
                if (sb.maxTs !== sa.maxTs) return sb.maxTs - sa.maxTs;
                return sb.count - sa.count;
              })[0]?.[0];
            }

            const filtered = finalDocId
              ? similarChunks.filter((c: any) => c.documentId === finalDocId)
              : similarChunks;

            const ordered = filtered.some(
              (c: any) => typeof c.timestamp === "number"
            )
              ? [...filtered].sort(
                  (a: any, b: any) => (b.timestamp ?? 0) - (a.timestamp ?? 0)
                )
              : filtered;
            for (const chunk of ordered) {
              segments.push({
                source: "doc",
                documentId: chunk.documentId,
                text: chunk.chunkText,
                similarity: (chunk as any).similarity ?? 0,
                timestamp: (chunk as any).timestamp ?? 0,
              });
            }
          } else {
            // If no specific docIds available, allow a global semantic search (user-wide)
            if (!selectedDocId) {
              try {
                const globalChunks =
                  await milvusService!.searchSimilarChunksByText(
                    retrievalQuery,
                    state.userId,
                    12,
                    undefined
                  );
                if (globalChunks && globalChunks.length > 0) {
                  const byDoc: Record<
                    string,
                    { count: number; maxTs: number; maxSim: number }
                  > = {};
                  globalChunks.forEach((r: any) => {
                    const id = r.documentId;
                    const cur = byDoc[id] || { count: 0, maxTs: 0, maxSim: 0 };
                    cur.count++;
                    cur.maxTs = Math.max(cur.maxTs, r.timestamp ?? 0);
                    cur.maxSim = Math.max(cur.maxSim, r.similarity ?? 0);
                    byDoc[id] = cur;
                  });
                  const topDocId = Object.entries(byDoc).sort(
                    (a: any, b: any) => {
                      const sa = a[1];
                      const sb = b[1];
                      if (sb.maxSim !== sa.maxSim) return sb.maxSim - sa.maxSim;
                      if (sb.maxTs !== sa.maxTs) return sb.maxTs - sa.maxTs;
                      return sb.count - sa.count;
                    }
                  )[0]?.[0];

                  const filteredGlobal = topDocId
                    ? globalChunks.filter((c: any) => c.documentId === topDocId)
                    : globalChunks;

                  const orderedGlobal = filteredGlobal.some(
                    (c: any) => typeof c.timestamp === "number"
                  )
                    ? [...filteredGlobal].sort(
                        (a: any, b: any) =>
                          (b.timestamp ?? 0) - (a.timestamp ?? 0)
                      )
                    : filteredGlobal;
                  for (const chunk of orderedGlobal) {
                    segments.push({
                      source: "global",
                      documentId: chunk.documentId,
                      text: chunk.chunkText,
                      similarity: (chunk as any).similarity ?? 0,
                      timestamp: (chunk as any).timestamp ?? 0,
                    });
                  }
                }
              } catch (err) {
                console.warn("Global search retrieval failed:", err);
              }
            }

            // Fallback: direct fetch by selectedDocId to ensure OCR context recovery
            if (!segments.length && selectedDocId) {
              try {
                const fallbackChunks =
                  await milvusService!.getChunksByDocumentId(
                    selectedDocId,
                    state.userId,
                    8
                  );
                if (fallbackChunks && fallbackChunks.length > 0) {
                  for (const chunk of fallbackChunks) {
                    segments.push({
                      source: "doc",
                      documentId: selectedDocId,
                      text: (chunk as any).chunkText,
                      similarity: 0.3,
                      timestamp: (chunk as any).timestamp ?? 0,
                    });
                  }
                }
              } catch (err) {
                console.warn("Fallback by selected documentId failed:", err);
              }
            }
          }
        }

        // Additionally retrieve conversation memory from Milvus by sessionId
        if (state.sessionId) {
          try {
            const convChunks = await milvusService!.searchSimilarChunksByText(
              retrievalQuery,
              state.userId,
              10,
              [state.sessionId]
            );
            for (const chunk of convChunks || []) {
              segments.push({
                source: "conversation",
                documentId: state.sessionId,
                text: (chunk as any).chunkText,
                similarity: (chunk as any).similarity ?? 0,
                timestamp: (chunk as any).timestamp ?? 0,
                priorityBoost: 0.1,
              });
            }
          } catch (err) {
            console.warn("Conversation retrieval failed:", err);
          }
        }
      } catch (error) {
        console.error("Error retrieving context:", error);
      }
    }

    // Add raw conversationContext lines as separate segments to avoid truncation
    if (state.conversationContext) {
      const lines = state.conversationContext
        .split("\n")
        .map((l) => l.trim())
        .filter(Boolean);
      for (const line of lines) {
        segments.push({
          source: "conversation",
          documentId: state.sessionId,
          text: line,
          similarity: 0.4,
          priorityBoost: 0.05,
        });
      }
    }

    // Pack all segments into final context without truncating individual segments
    context = packContextSegments(segments, MAX_CONTEXT_CHARS);

    // console.log("Final context:", context);

    return {
      context,
    };
  }

  // New node: OCR selected documents and append extracted text to context
  private async ocrDocumentsNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    try {
      const selected = state.referencedDocs || [];
      if (!selected.length) {
        return {};
      }

      const ocrPrompt =
        "Extract clear text from this document image. Preserve headings, tables, and lists in plain text. Return only clean text for QA/summarization.";

      // Init Milvus once (if configured) before batch inserts
      if (milvusService) {
        try {
          await initializeMilvus();
        } catch (e) {
          console.warn("Milvus init failed prior to OCR inserts:", e);
        }
      }

      const OCR_CONCURRENCY = 2;

      // Step 1: Run OCR in parallel with limited concurrency
      const ocrResults = await mapWithConcurrency(
        selected,
        OCR_CONCURRENCY,
        async (doc) => {
          const url = doc.url;
          try {
            const text = await performOCR(url, ocrPrompt);

            // Derive stable documentId from download URL if possible
            const itemIdFromUrl = (() => {
              try {
                const u = new URL(url, "http://localhost");
                const pathname = u.pathname || "";
                const match = pathname.match(/\/items\/(.+?)\/download/);
                return match && match[1] ? match[1] : undefined;
              } catch {
                return undefined;
              }
            })();

            const milvusDocId = itemIdFromUrl || state.sessionId;
            return { url, text, milvusDocId };
          } catch (err) {
            console.error("OCR failed for", url, err);
            return {
              url,
              text: "",
              milvusDocId: undefined as string | undefined,
            };
          }
        }
      );

      const successful = ocrResults.filter(
        (r) => r.text && r.text.trim().length
      );
      if (!successful.length) {
        return {};
      }

      const ocrDocIds = successful
        .map((r) => r.milvusDocId)
        .filter((v): v is string => Boolean(v));

      // Step 2: Insert OCR texts into Milvus in parallel (each handles its own batching)
      if (milvusService) {
        const ms = milvusService!; // narrow to non-null within this block
        await mapWithConcurrency(
          successful,
          OCR_CONCURRENCY,
          async ({ url, text, milvusDocId }) => {
            if (!milvusDocId) return;
            try {
              const labeled = `OCR from ${url}:\n${text}`;
              await ms.processAndInsertDocument(
                milvusDocId,
                labeled,
                state.userId
              );
            } catch (e) {
              console.warn("Milvus insert failed for OCR:", e);
            }
          }
        );
      }

      // Link OCR docIds into state.documentIds to strengthen retrieval
      const mergedDocIds = Array.from(
        new Set([...(state.documentIds || []), ...ocrDocIds])
      );

      // Do NOT append full OCR text into context. We rely on Milvus retrieval next.
      return {
        referencedDocs: state.referencedDocs,
        documentIds: mergedDocIds,
      };
    } catch (error) {
      console.error("Error in OCR node:", error);
      return {};
    }
  }

  /**
   * Helper method to detect if a query is likely a document generation request
   */
  private isDocumentGenerationRequest(query: string): boolean {
    const q = query.toLowerCase();
    const actionKeywords = [
      "create",
      "generate",
      "make",
      "write",
      "build",
      "produce",
      "export",
      "download",
      "save",
      "convert",
      // Indonesian verbs
      "buat",
      "jadikan",
      "ubah",
      "ekspor",
    ];
    const formatKeywords = [
      "pdf",
      "docx",
      "xlsx",
      "pptx",
      "document",
      "dokumen",
      "report",
      "laporan",
      "presentation",
      "presentasi",
      "slide",
      "powerpoint",
      "excel",
      "word",
      "spreadsheet",
      "table",
      "tabel",
    ];

    const hasAction = actionKeywords.some((k) => q.includes(k));
    const hasFormat = formatKeywords.some((k) => q.includes(k));
    // Only generate when both an action and a document format/type are present
    return hasAction && hasFormat;
  }

  // Detect document type heuristically from query without calling LLM
  private detectDocumentType(query: string): "pdf" | "xlsx" | "docx" | "pptx" {
    const q = query.toLowerCase();
    if (
      q.includes("pptx") ||
      q.includes("powerpoint") ||
      q.includes("presentation") ||
      q.includes("presentasi") ||
      q.includes("slide")
    ) {
      return "pptx";
    }
    if (
      q.includes("xlsx") ||
      q.includes("excel") ||
      q.includes("spreadsheet") ||
      q.includes("table") ||
      q.includes("tabel")
    ) {
      return "xlsx";
    }
    if (
      q.includes("docx") ||
      q.includes("word") ||
      q.includes("dokumen") ||
      q.includes("document") ||
      q.includes("proposal") ||
      q.includes("letter") ||
      q.includes("surat")
    ) {
      return "docx";
    }
    if (
      q.includes("pdf") ||
      q.includes("report") ||
      q.includes("laporan") ||
      q.includes("analisis") ||
      q.includes("analysis")
    ) {
      return "pdf";
    }
    return "pdf";
  }

  private async decideDocumentGenerationNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    try {
      // 1) Heuristik konservatif sebagai gerbang awal: jika tidak jelas, JANGAN generate
      const heuristicSuggests = this.isDocumentGenerationRequest(state.query);
      if (!heuristicSuggests) {
        return { shouldGenerateDoc: false, documentType: undefined };
      }

      // 2) Minta konfirmasi ke LLM dengan output JSON ketat
      const systemText = clampText(
        `You are a classifier for document generation intent.
- ONLY approve generation if the user explicitly asks to create/produce/export a document AND mentions a type: "pdf", "docx", "xlsx", or "pptx".
- Return ONLY a JSON object with keys: "shouldGenerate" (boolean) and "type" ("pdf"|"docx"|"xlsx"|"pptx"|null).
- If it is unclear or just Q&A, set "shouldGenerate" = false and "type" = null.`,
        MAX_SYSTEM_CHARS
      );
      const safeQuery = clampText(state.query, MAX_QUERY_CHARS);
      const messages = [
        new SystemMessage(systemText),
        new HumanMessage(`Query:\n${safeQuery}`),
      ];

      const response = await this.llm.invoke(messages);
      const raw =
        typeof response.content === "string"
          ? response.content
          : JSON.stringify(response.content);

      let shouldGenerate = false;
      let type: "pdf" | "xlsx" | "docx" | "pptx" | undefined;

      try {
        const jsonText = (() => {
          const start = raw.indexOf("{");
          const end = raw.lastIndexOf("}");
          if (start !== -1 && end !== -1 && end > start)
            return raw.slice(start, end + 1);
          return raw;
        })();
        const parsed = JSON.parse(jsonText);
        shouldGenerate = !!parsed.shouldGenerate;
        const maybeType = parsed.type as string | null | undefined;
        if (
          maybeType === "pdf" ||
          maybeType === "docx" ||
          maybeType === "xlsx" ||
          maybeType === "pptx"
        ) {
          type = maybeType;
        }
      } catch {
        // Jika parsing gagal, tetap konservatif: jangan generate
        shouldGenerate = false;
      }

      // 3) Hanya generate bila KEDUANYA (heuristik & LLM) menyatakan true
      if (!shouldGenerate) {
        return { shouldGenerateDoc: false, documentType: undefined };
      }

      const documentType = type ?? this.detectDocumentType(state.query);
      return { shouldGenerateDoc: true, documentType };
    } catch (error) {
      console.error("Error in document generation decision:", error);
      return { shouldGenerateDoc: false, documentType: undefined };
    }
  }

  /**
   * Conditional function to determine next node based on document generation decision
   */
  private shouldGenerateDocument(state: AgentState): string {
    return state.shouldGenerateDoc
      ? "generateDocumentResponse"
      : "saveConversation";
  }

  /**
   * Generate HTML-formatted response for document creation
   */
  private async generateDocumentResponseNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    try {
      const safeContext = state.context; // context already packed
      const safeQuery = state.query;

      // console.log("safeContext 2:", safeContext);
      // console.log("safeQuery 2:", safeQuery);

      const baseSystemText = clampText(
        `You generate structured document content. Respond in Markdown only (no HTML).
     - Use headings (#, ##, ###), paragraphs, bullet lists (-) and numbered lists (1.).
     - Use tables with pipe syntax when helpful: | Header | Header |\n| --- | --- |\n| Cell | Cell |
     - Use **bold**, *italic*, > blockquotes, and fenced code blocks (three backticks).
     - Do NOT include CSS, raw HTML, or inline styles unless explicitly requested.
     - If no relevant document context is found, explicitly say so and write helpful general content for the request.
     - Keep Markdown concise, well-structured, and readable.
     - Excel JSON is handled in a separate step; do not emit CSV or JSON here.`,
        MAX_SYSTEM_CHARS
      );
      const refDoc =
        state.referencedDocs && state.referencedDocs.length > 0
          ? state.referencedDocs[0]
          : undefined;
      const refLine = refDoc
        ? `Current reference document: ${refDoc.name} - ${refDoc.url}`
        : "";
      const systemText = clampText(
        [baseSystemText, refLine].filter(Boolean).join("\n"),
        MAX_SYSTEM_CHARS
      );

      const messages = [
        new SystemMessage(systemText),
        new HumanMessage(
          `${
            safeContext ? `Context:\n${safeContext}\n\n` : ""
          }Request:\n${safeQuery}`
        ),
      ];

      const response = await this.llm.invoke(messages);
      const aiResponse = response.content as string;

      return {
        aiResponse,
        finalResponse: aiResponse,
      };
    } catch (error) {
      console.error("Error generating document response:", error);
      throw new Error("Failed to generate document response");
    }
  }

  /**
   * Generate HTML-formatted response for document creation
   */
  private async generateResponseNode(
    state: AgentState
  ): Promise<Partial<AgentState>> {
    try {
      const safeContext = state.context; // context already packed
      const safeQuery = state.query;

      // console.log("safeContext:", safeContext);
      // console.log("safeQuery:", safeQuery);

      const baseSystemText = clampText(
        `You analyze documents and answer questions using provided context.
     Respond in Markdown. Prefer headings, lists, tables, and code blocks when helpful.
     Do not use HTML unless explicitly requested.`,
        MAX_SYSTEM_CHARS
      );
      const refDoc =
        state.referencedDocs && state.referencedDocs.length > 0
          ? state.referencedDocs[0]
          : undefined;
      const refLine = refDoc
        ? `Current reference document: ${refDoc.name} - ${refDoc.url}`
        : "";
      const systemText = clampText(
        [baseSystemText, refLine].filter(Boolean).join("\n"),
        MAX_SYSTEM_CHARS
      );

      const messages = [
        new SystemMessage(systemText),
        new HumanMessage(
          `${
            safeContext ? `Context:\n${safeContext}\n\n` : ""
          }Question:\n${safeQuery}`
        ),
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
   * Generate PDF document using react-pdf-html
   */
  private async generatePDFDocument(
    content: string,
    title: string
  ): Promise<{ buffer: Buffer; filename: string; mimeType: string }> {
    // Create minimal HTML content with basic CSS only
    const htmlContent = `
<html>
<head>
     <meta charset="UTF-8">
     <title>${title}</title>
     <style>
         body {
             font-family: 'Roboto';
             font-size: 12px;
             color: #333;
             margin: 0px;
             padding: 40px;
             line-height: 1.6;
         }
         h1 { 
             font-size: 24px; 
             font-weight: 700; 
             margin: 16px 0px 12px 0px; 
             padding-bottom: 8px;
             border-bottom: 2px solid #333;
         }
         h2 { 
             font-size: 20px; 
             font-weight: 700; 
             margin: 14px 0px 10px 0px; 
             padding-bottom: 4px;
             border-bottom: 1px solid #666;
         }
         h3 { 
             font-size: 18px; 
             font-weight: 700; 
             margin: 12px 0px 8px 0px; 
         }
         h4 { 
             font-size: 16px; 
             font-weight: 700; 
             margin: 10px 0px 6px 0px; 
         }
         h5 { 
             font-size: 15.2px; 
             font-weight: 700; 
             margin: 8px 0px 4px 0px; 
         }
         h6 { 
             font-size: 14.4px; 
             font-weight: 700; 
             margin: 6px 0px 4px 0px; 
         }
         p {
             font-size: 16px;
             font-weight: normal;
             margin: 8px 0px;
             text-align: justify;
         }
         ul, ol {
             margin: 8px 0px;
             padding-left: 20px;
         }
         li {
             margin: 4px 0px;
         }
         table {
             margin: 12px 0px;
             width: 100%;
             border-collapse: collapse;
         }
         th, td {
             border: 1px solid #ddd;
             padding: 8px;
             font-size: 11px;
         }
         th {
             background-color: #f2f2f2;
             font-weight: bold;
         }
         blockquote {
             margin: 12px 0px;
             padding: 8px 16px;
             background-color: #f8f9fa;
             border-left: 4px solid #007bff;
             font-style: italic;
         }
         code {
             background-color: #f4f4f4;
             padding: 2px 4px;
             font-size: 10px;
             border-radius: 2px;
         }
         pre {
             background-color: #f4f4f4;
             padding: 12px;
             margin: 12px 0px;
             font-size: 10px;
             border-radius: 4px;
             overflow-x: auto;
         }
     </style>
 </head>
 <body>
     ${content}
 </body>
 </html>`;

    // Generate PDF from HTML using react-pdf-html
    const pdfDocument = React.createElement(
      Document,
      null,
      React.createElement(
        Page,
        null,
        React.createElement(Html, null, htmlContent)
      )
    );

    // Use renderToBuffer from named import instead
    const { renderToBuffer } = await import("@react-pdf/renderer");
    const pdfBuffer = await renderToBuffer(pdfDocument);

    return {
      buffer: pdfBuffer,
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
    const XLSX = await import("xlsx");

    const safeContent = clampText(content, MAX_EXCEL_CONTENT_CHARS);

    const excelPrompt = `Return ONLY a valid JSON object (no explanations, no markdown).
     Transform the following content into a structured format for Excel.
     Content:\n${safeContent}
     Schema example (replace with actual data):
     {
       "name": "${title}",
       "sheets": [
         {
           "name": "Sheet1",
           "columns": [
             { "name": "Column1", "width": 15, "type": "text" },
             { "name": "Column2", "width": 20, "type": "number", "format": "#,##0.00" }
           ],
           "data": [
             { "Column1": "Value1", "Column2": 123.45 }
           ]
         }
       ]
     }
     Rules:
     - Prefer tabular extraction; if none exists, create a reasonable structure.
     - Column types: text | number | date. Include number/date formats when applicable.
     - Output MUST be a single JSON object starting with { and ending with }.`;

    const excelResponse = await this.llm.invoke(excelPrompt);
    let excelData;

    try {
      let jsonString = excelResponse.content as string;
      jsonString = jsonString.replace(/```json\s*/g, "").replace(/```\s*/g, "");
      const firstBrace = jsonString.indexOf("{");
      const lastBrace = jsonString.lastIndexOf("}");
      if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        jsonString = jsonString.substring(firstBrace, lastBrace + 1);
      }
      excelData = JSON.parse(jsonString);
    } catch (error) {
      excelData = {
        name: title,
        sheets: [
          {
            name: "Sheet1",
            columns: [{ name: "Content", width: 50, type: "text" }],
            data: [{ Content: safeContent }],
          },
        ],
      };
    }

    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Add sheets to workbook
    excelData.sheets.forEach((sheetData: any, index: number) => {
      const worksheetData = [];

      // Extract column names from columns metadata
      const columnNames = sheetData.columns
        ? sheetData.columns.map((col: any) => col.name)
        : [];

      // Add headers if columns are defined
      if (columnNames.length > 0) {
        worksheetData.push(columnNames);
      }

      // Add data rows - convert objects to arrays based on column order
      if (sheetData.data && sheetData.data.length > 0) {
        sheetData.data.forEach((rowData: any) => {
          if (columnNames.length > 0) {
            // Convert object to array based on column order
            const rowArray = columnNames.map(
              (colName: string) => rowData[colName] || ""
            );
            worksheetData.push(rowArray);
          } else {
            // Fallback: if no columns defined, try to extract values
            const values = Object.values(rowData);
            worksheetData.push(values);
          }
        });
      }

      // Create worksheet
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);

      // Apply column formatting and widths if available
      if (sheetData.columns) {
        const colWidths: any[] = [];
        const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");

        sheetData.columns.forEach((col: any, colIndex: number) => {
          // Set column width
          if (col.width) {
            colWidths[colIndex] = { wch: col.width };
          }

          // Apply formatting to data cells (skip header row)
          if (col.format && col.type === "number") {
            for (let rowIndex = 1; rowIndex <= range.e.r; rowIndex++) {
              const cellAddress = XLSX.utils.encode_cell({
                r: rowIndex,
                c: colIndex,
              });
              if (worksheet[cellAddress]) {
                worksheet[cellAddress].z = col.format;
              }
            }
          }
        });

        if (colWidths.length > 0) {
          worksheet["!cols"] = colWidths;
        }
      }

      // Add worksheet to workbook
      const sheetName = sheetData.name || `Sheet${index + 1}`;
      XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
    });

    // Generate Excel buffer
    const excelBuffer = XLSX.write(workbook, {
      type: "buffer",
      bookType: "xlsx",
    });

    return {
      buffer: excelBuffer,
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
    const HTMLtoDOCX = (await import("html-to-docx")).default;

    // Enhanced system prompt for DOCX generation with HTML formatting
    const docxPrompt = `Transform the following content into well-structured HTML suitable for Word document generation:

     Content: ${content}

     Requirements:
     - Use proper HTML structure with <h1> <h2> <h3> <h4> <h5> for headings
     - Use <ul> and <ol> for bullet points and numbered lists
     - Include proper paragraph breaks with <p> tags
     - Make it professional and document-style
     - Organize content with clear sections and subsections
     - Use <strong> and <em> for bold and italic formatting
     - Include tables using proper HTML table syntax (<table>, <tr>, <td>, <th>)
     - Use <blockquote> for highlighting important information
     - Use <code> for inline code or technical terms
     - Use <pre><code> blocks for code snippets
     - Ensure proper nesting and valid HTML structure
     - Do NOT include any CSS styling or font-family properties
     - Do NOT add <style> tags or inline CSS styles

     Provide only the HTML content (no explanations):`;

    const htmlResponse = await this.llm.invoke(docxPrompt);
    let htmlContent = htmlResponse.content as string;

    // Add comprehensive CSS styling for better document appearance
    const styledHtml = `
       <!DOCTYPE html>
       <html>
         <head>
           <meta charset="UTF-8">
           <title>${title}</title>
           <style>
             body {
               font-family: 'Times New Roman', serif;
               font-size: 12pt;
               line-height: 1.5;
               margin: 1in;
               color: #000;
             }
             h1 {
               font-size: 24px;
               font-weight: 700;
               margin: 24pt 0 12pt 0;
               page-break-after: avoid;
             }
             h2 {
               font-size: 20px;
               font-weight: 700;
               margin: 18pt 0 10pt 0;
               page-break-after: avoid;
             }
             h3 {
               font-size: 18px;
               font-weight: 700;
               margin: 14pt 0 8pt 0;
               page-break-after: avoid;
             }
             h4 {
               font-size: 16px;
               font-weight: 700;
               margin: 12pt 0 6pt 0;
               page-break-after: avoid;
             }
             h5 {
               font-size: 15.2px;
               font-weight: 700;
               margin: 10pt 0 6pt 0;
               page-break-after: avoid;
             }
             h6 {
               font-size: 14.4px;
               font-weight: 700;
               margin: 8pt 0 6pt 0;
               page-break-after: avoid;
             }
             p {
               font-size: 16px;
               font-weight: normal;
               margin: 0 0 12pt 0;
               text-align: justify;
             }
             ul, ol {
               margin: 12pt 0;
               padding-left: 36pt;
             }
             li {
               margin: 6pt 0;
             }
             table {
               border-collapse: collapse;
               width: 100%;
               margin: 12pt 0;
             }
             th, td {
               border: 1pt solid #000;
               padding: 6pt;
               text-align: left;
             }
             th {
               background-color: #f0f0f0;
               font-weight: bold;
             }
             blockquote {
               margin: 12pt 24pt;
               padding: 12pt;
               border-left: 3pt solid #ccc;
               background-color: #f9f9f9;
               font-style: italic;
             }
             code {
               font-family: 'Courier New', monospace;
               font-size: 10pt;
               background-color: #f5f5f5;
               padding: 2pt;
               border: 1pt solid #ddd;
             }
             pre {
               background-color: #f5f5f5;
               border: 1pt solid #ddd;
               padding: 12pt;
               margin: 12pt 0;
               overflow-x: auto;
             }
             pre code {
               background: none;
               border: none;
               padding: 0;
             }
           </style>
         </head>
         <body>
           ${htmlContent}
         </body>
       </html>
     `;

    // Configure options for professional document styling
    const options = {
      orientation: "portrait" as const,
      margins: {
        top: 1440, // 1 inch
        right: 1440,
        bottom: 1440,
        left: 1440,
      },
      title: title,
      creator: "Document Assistant",
      font: "Times New Roman",
      fontSize: 22, // 11pt in HIP (Half of point)
    };

    // Convert HTML to DOCX
    const docxBuffer = await HTMLtoDOCX(styledHtml, null, options);

    return {
      buffer: Buffer.from(docxBuffer),
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
    const pptxgen = await import("pptxgenjs");
    const html2pptxgenjs = await import("html2pptxgenjs");

    // Enhanced system prompt for HTML content suitable for presentations
    const htmlPrompt = `Transform the following content into well-structured HTML suitable for presentation slides:

     Content: ${content}

     Requirements:
     - Create clear, concise sections that would work well as slides
     - Use proper HTML headings (h1, h2, h3) for slide titles and sections
     - Use bullet points (<ul>, <ol>) and numbered lists for key information
     - Keep content presentation-friendly and easy to read
     - Include proper HTML structure with semantic elements
     - Make it professional and presentation-style
     - Use proper HTML formatting (headings, lists, paragraphs, emphasis)

     Format the content as clean, semantic HTML that would translate well to presentation slides.

     Provide only the HTML content (no explanations):`;

    const htmlResponse = await this.llm.invoke(htmlPrompt);
    let htmlContent = htmlResponse.content as string;

    // Clean up the HTML content
    htmlContent = htmlContent.replace(/```html\n?/g, "").replace(/```\n?/g, "");

    // Create a new presentation
    const pres = new pptxgen.default();

    // Configure CSS options for proper styling
    const options = {
      css: `
         h1, h2, h3, h4, h5, h6 {
           font-family: 'Calibri', Arial, sans-serif;
           font-weight: bold;
           margin: 12pt 0 6pt 0;
           color: #1f4e79;
         }
         h1 { font-size: 24pt; }
         h2 { font-size: 20pt; }
         h3 { font-size: 18pt; }
         h4 { font-size: 16pt; }
         h5 { font-size: 14pt; }
         h6 { font-size: 12pt; }
         p {
           font-family: 'Calibri', Arial, sans-serif;
           font-size: 12pt;
           margin: 6pt 0;
           line-height: 1.4;
         }
         ul, ol {
           font-family: 'Calibri', Arial, sans-serif;
           font-size: 12pt;
           margin: 6pt 0;
           padding-left: 20pt;
         }
         li {
           margin: 3pt 0;
           line-height: 1.3;
         }
         strong, b {
           font-weight: bold;
         }
         em, i {
           font-style: italic;
         }
         table {
           border-collapse: collapse;
           width: 100%;
           margin: 6pt 0;
         }
         th, td {
           border: 1pt solid #000;
           padding: 4pt;
           text-align: left;
           font-size: 11pt;
         }
         th {
           background-color: #f0f0f0;
           font-weight: bold;
         }
       `,
      fontFace: "Calibri",
      fontSize: 12,
      paraSpaceAfter: 6,
      paraSpaceBefore: 3,
    };

    // Convert HTML to PptxGenJS text items
    const items = html2pptxgenjs.htmlToPptxText(htmlContent, options);

    // Add a slide with the converted content
    const slide = pres.addSlide();

    // Add title if provided
    if (title) {
      slide.addText(title, {
        x: 0.5,
        y: 0.2,
        w: 9,
        h: 0.8,
        fontSize: 24,
        bold: true,
        color: "1f4e79",
        align: "center",
        fontFace: "Calibri",
      });
    }

    // Add the main content
    slide.addText(items as any, {
      x: 0.5,
      y: title ? 1.2 : 0.5,
      w: 9,
      h: title ? 5.8 : 6.5,
      valign: "top",
      fontFace: "Calibri",
    });

    // Generate the PPTX file as buffer
    const pptxBuffer = await pres.write({ outputType: "nodebuffer" });

    return {
      buffer: pptxBuffer as Buffer,
      filename: `${title.replace(/[^a-zA-Z0-9]/g, "_")}.pptx`,
      mimeType:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
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

  // Wrapper to persist memory entries to Milvus
  private async saveMemoryEntry(
    userId: string,
    sessionId: string | undefined,
    role: "user" | "assistant" | "ocr",
    content: string
  ): Promise<void> {
    try {
      await saveMemoryEntry(userId, sessionId, role, content);
    } catch (err) {
      console.warn("saveMemoryEntry wrapper failed:", err);
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
      // Persist memories to Milvus only; API route handles DB chatMessage persistence
      await this.saveMemoryEntry(
        state.userId,
        state.sessionId,
        "user",
        state.query
      );

      await this.saveMemoryEntry(
        state.userId,
        state.sessionId,
        "assistant",
        state.finalResponse
      );
    } catch (error) {
      console.error("Error saving conversation memory:", error);
      // Do not throw to avoid breaking response flow
    }

    return {};
  }

  /**
   * Process a query using the LangGraph workflow
   */
  async processQuery(input: AgentInput): Promise<AgentOutput> {
    try {
      // Resolve conversation context: use provided value or build from Prisma by sessionId (no truncation)
      let effectiveConversationContext = (
        input.conversationContext || ""
      ).trim();
      if (
        (!effectiveConversationContext ||
          !effectiveConversationContext.trim()) &&
        input.sessionId
      ) {
        const built = await buildConversationContextFromSession(
          input.sessionId
        );
        effectiveConversationContext = built;
      }

      // Initialize state
      const initialState: AgentState = {
        query: input.query,
        userId: input.userId,
        sessionId: input.sessionId,
        useSemanticSearch: input.useSemanticSearch ?? true,
        documentIds: input.documentIds,
        conversationContext: effectiveConversationContext,
        context: "",
        aiResponse: "",
        documentFile: undefined,
        finalResponse: "",
        shouldGenerateDoc: false,
        documentType: undefined,
        referencedDocs: input.referencedDocs,
      };

      // Run the graph
      const result = await this.graph.invoke(initialState);

      return {
        response: result.finalResponse,
        referencedDocs: result.referencedDocs,
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
