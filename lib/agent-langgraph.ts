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
     // OCR node
     const ocrDocumentsNode = this.ocrDocumentsNode.bind(this);

     const workflow = new StateGraph(AgentStateAnnotation)
       .addNode("retrieveContext", retrieveContextNode)
       .addNode("ocrDocuments", ocrDocumentsNode)
       .addNode("generateResponse", generateResponseNode)
       .addNode("generateDocumentResponse", generateDocumentResponseNode)
       .addNode("decideDocumentGeneration", decideDocumentGenerationNode)
       .addNode("generateDocument", generateDocumentNode)
       .addNode("saveConversation", saveConversationNode)
       .addEdge(START, "retrieveContext")
       .addEdge("retrieveContext", "ocrDocuments")
       .addEdge("ocrDocuments", "generateResponse")
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

     if (state.useSemanticSearch) {
       try {
         // Use Milvus for semantic search
         if (!milvusService) {
           console.warn("Milvus not configured - skipping context retrieval");
           return { ...state, context: "" };
         }

         // Ensure Milvus is initialized and collection ready
         await initializeMilvus();

         // Default to current session when documentIds not provided
         const targetDocIds =
           state.documentIds && state.documentIds.length
             ? state.documentIds
             : state.sessionId
             ? [state.sessionId]
             : undefined;

         const similarChunks = await milvusService.searchSimilarChunksByText(
           state.query,
           state.userId,
           5,
           targetDocIds
         );

         // Build context from similar chunks
         context = similarChunks.map((chunk) => chunk.chunkText).join("\n\n");

         // Cap context length to avoid overly long prompts
         if (context.length > 6000) {
           context = context.slice(-6000);
         }

         // Get referenced document IDs
         // referencedDocs = Array.from(
         // new Set(similarChunks.map((chunk) => chunk.documentId))
         // );
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
         "Extract clear, accurate text from this document image. Preserve headings, tables, and lists in plain text form. Return only text usable for QA and summarization.";

       const results: { url: string; text: string }[] = [];
       for (const doc of selected) {
         const url = doc.url;
         try {
           const text = await performOCR(url, ocrPrompt);
           results.push({ url, text });
           if (milvusService && state.sessionId) {
             await initializeMilvus();
             const labeled = `OCR from ${url}:\n${text}`;
             await milvusService.processAndInsertDocument(
               state.sessionId,
               labeled,
-              state.userId
+              state.userId,
+              800,
+              160
             );
           }
         } catch (err) {
           console.error("OCR failed for", url, err);
         }
       }

       if (!results.length) {
         return {};
       }

       // Build OCR context block
       const ocrContext = results
         .map((r, idx) => `Document ${idx + 1} (${r.url}):\n${r.text}`)
         .join("\n\n");

       const combinedContext = state.context
         ? `${state.context}\n\n${ocrContext}`
         : ocrContext;

       // referenced = Array.from(
       // new Set([...(state.referencedDocs || []), ...urls])
       // );
       //
       // return { context: combinedContext, referencedDocs: referenced };
       return { context: combinedContext, referencedDocs: state.referencedDocs };
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
       const shouldGenerate = this.isDocumentGenerationRequest(state.query);
       if (!shouldGenerate) {
         return { shouldGenerateDoc: false, documentType: undefined };
       }

       const documentType = this.detectDocumentType(state.query);
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
       const messages = [
         new SystemMessage(`You are a helpful AI assistant that generates structured content for document creation.

   - Use <p> tags for paragraphs
   - Use <ul> and <ol> for bullet points and numbered lists
   - Use <li> for list items
   - Use <table>, <tr>, <th>, <td> for tables
   - Use <strong> for bold text and <em> for italic text
   - Use <blockquote> for important quotes or highlights
   - Use <code> for inline code and <pre><code> for code blocks
   - Ensure proper HTML structure and nesting
   - Do NOT use Markdown formatting (no #, *, -, etc.)
   - Do NOT include any CSS styling, especially font-family properties
   - Do NOT add <style> tags or inline CSS styles
   - Provide complete, well-structured HTML content without any CSS

   For Excel (XLSX) documents: Follow the specific JSON format instructions provided in the Excel generation prompt.

   Example HTML structure (for PDF, DOCX, PPTX):
   <h1>Document Title</h1>
   <p>Introduction paragraph with <strong>important</strong> information.</p>
   <h2>Section Title</h2>
   <ul>
   <li>First bullet point</li>
   <li>Second bullet point</li>
   </ul>
   <table>
   <tr><th>Header 1</th><th>Header 2</th></tr>
   <tr><td>Data 1</td><td>Data 2</td></tr>
   </table>

   ${
     state.context
       ? `Context from documents:
   ${state.context}

   Please use this context to create the document content. If the context doesn't contain relevant information, you can provide general content but mention that you don't have specific information from the documents.`
       : "No document context available. Please create comprehensive document content based on the user's request."
   }

   When generating documents, please:
   1. Provide complete, well-structured HTML content appropriate for the document type
   2. Use proper HTML formatting and organization
   3. Include relevant details and information
   4. Make the content professional and comprehensive
   5. Use semantic HTML tags for better structure
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
       const messages = [
         new SystemMessage(`You are a helpful AI assistant that analyzes documents and answers questions based on the provided context.

     Respond in Markdown by default.
     - Use headings when helpful
     - Use bullet and numbered lists
     - Use tables when data fits
     - Use **bold** and _italics_ for emphasis
     - Use blockquotes for highlights
     - Use fenced code blocks for examples or code
     - Do NOT use HTML unless explicitly requested or when generating documents

     ${
       state.context
         ? `Context from documents:\n${state.context}\n\nPlease use this context to answer the user's question. If the context doesn't contain relevant information, you can provide a general response but mention that you don't have specific information from the documents.`
         : "No document context available. Please provide a helpful general response."
     }

     Provide helpful, informative responses that directly address the user's question.`),
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

     // Enhanced system prompt for Excel generation - JSON format
     const excelPrompt = `You must return ONLY a valid JSON object. Do not include any explanations, markdown formatting, or code blocks.

     Transform the following content into a structured JSON format suitable for Excel generation:

     Content: ${content}

     Return ONLY this JSON structure (replace with actual data):
     {
       "name": "Document Title",
       "sheets": [
         {
           "name": "Sheet1",
           "columns": [
             {
               "name": "Column1",
               "width": 15,
               "type": "text"
             },
             {
               "name": "Column2", 
               "width": 20,
               "type": "number",
               "format": "#,##0.00"
             }
           ],
           "data": [
             {
               "Column1": "Value1",
               "Column2": 123.45
             },
             {
               "Column1": "Value2", 
               "Column2": 678.90
             }
           ]
         }
       ]
     }

     Rules:
     - Extract or create tabular data with clear column headers
     - Use "columns" array to define column metadata (name, width, type, format)
     - Use "data" array with objects where keys match column names
     - Column types: "text", "number", "date"
     - For number columns, include format (e.g., "#,##0.00" for currency)
     - For date columns, use format like "mmm dd, yyyy"
     - Multiple tables = multiple sheets
     - If no tabular data exists, create structured format from content

     CRITICAL: Return ONLY the JSON object starting with { and ending with }. No explanations, no markdown, no code blocks.`;

     const excelResponse = await this.llm.invoke(excelPrompt);
     let excelData;

     try {
       // Clean the response to extract only JSON
       let jsonString = excelResponse.content as string;

       // Remove markdown code blocks if present
       jsonString = jsonString.replace(/```json\s*/g, "").replace(/```\s*/g, "");

       // Find the first { and last } to extract only the JSON object
       const firstBrace = jsonString.indexOf("{");
       const lastBrace = jsonString.lastIndexOf("}");

       if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
         jsonString = jsonString.substring(firstBrace, lastBrace + 1);
       }

       excelData = JSON.parse(jsonString);
     } catch (error) {
       // Fallback to simple structure if JSON parsing fails
       excelData = {
         name: title,
         sheets: [
           {
             name: "Sheet1",
             columns: [
               {
                 name: "Content",
                 width: 50,
                 type: "text",
               },
             ],
             data: [
               {
                 Content: content,
               },
             ],
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
       // Initialize state
       const initialState: AgentState = {
         query: input.query,
         userId: input.userId,
         sessionId: input.sessionId,
         useSemanticSearch: input.useSemanticSearch,
         documentIds: input.documentIds,
         conversationContext: input.conversationContext,
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
