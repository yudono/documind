import { ChatGroq } from "@langchain/groq";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { z } from "zod";

// Define structured document formats
export const DocumentStructureSchema = z.object({
  title: z.string().describe("Document title"),
  sections: z.array(
    z.object({
      heading: z.string().describe("Section heading"),
      content: z.string().describe("Section content"),
      subsections: z
        .array(
          z.object({
            heading: z.string().describe("Subsection heading"),
            content: z.string().describe("Subsection content"),
            bulletPoints: z
              .array(z.string())
              .optional()
              .describe("Optional bullet points"),
          })
        )
        .optional(),
    })
  ),
  metadata: z
    .object({
      author: z.string().optional(),
      date: z.string().optional(),
      category: z.string().optional(),
      tags: z.array(z.string()).optional(),
    })
    .optional(),
});

export const TableStructureSchema = z.object({
  title: z.string().describe("Table title"),
  headers: z.array(z.string()).describe("Column headers"),
  rows: z.array(z.array(z.string())).describe("Table rows data"),
  summary: z.string().optional().describe("Optional table summary"),
});

export const ReportStructureSchema = z.object({
  title: z.string().describe("Report title"),
  executive_summary: z.string().describe("Executive summary"),
  introduction: z.string().describe("Introduction section"),
  methodology: z.string().optional().describe("Methodology section"),
  findings: z.array(
    z.object({
      title: z.string().describe("Finding title"),
      description: z.string().describe("Finding description"),
      data: z
        .array(
          z.object({
            label: z.string(),
            value: z.string(),
          })
        )
        .optional(),
    })
  ),
  conclusions: z.string().describe("Conclusions section"),
  recommendations: z.array(z.string()).describe("List of recommendations"),
});

export type DocumentStructure = z.infer<typeof DocumentStructureSchema>;
export type TableStructure = z.infer<typeof TableStructureSchema>;
export type ReportStructure = z.infer<typeof ReportStructureSchema>;

interface DocumentFormatterState {
  input: string;
  documentType: "document" | "table" | "report";
  rawContent: string;
  structuredData: DocumentStructure | TableStructure | ReportStructure | null;
  formattedOutput: string;
  error?: string;
}

export class AIDocumentFormatter {
  private llm: ChatGroq;

  constructor() {
    this.llm = new ChatGroq({
      apiKey: process.env.GROQ_API_KEY!,
      model: "llama-3.3-70b-versatile",
      temperature: 0.3,
    });
  }

  private async analyzeContent(input: string): Promise<{
    documentType: "document" | "table" | "report";
    rawContent: string;
  }> {
    const analysisPrompt = `
Analyze the following content and determine the most appropriate document type and extract the raw content:

Content: ${input}

Determine if this should be formatted as:
1. "document" - General document with sections and subsections
2. "table" - Tabular data with rows and columns
3. "report" - Formal report with executive summary, findings, and recommendations

Respond with ONLY the document type (document/table/report) followed by a newline and then the cleaned raw content.
`;

    const response = await this.llm.invoke([
      new SystemMessage(
        "You are an expert document analyzer. Analyze content and determine the best document structure."
      ),
      new HumanMessage(analysisPrompt),
    ]);

    const responseText = response.content as string;
    const lines = responseText.trim().split("\n");
    const documentType = lines[0].trim() as "document" | "table" | "report";
    const rawContent = lines.slice(1).join("\n").trim();

    return {
      documentType,
      rawContent,
    };
  }

  private async structureData(
    documentType: "document" | "table" | "report",
    rawContent: string
  ): Promise<DocumentStructure | TableStructure | ReportStructure> {
    let structurePrompt = "";
    let schema = "";

    switch (documentType) {
      case "document":
        schema = JSON.stringify(DocumentStructureSchema.shape, null, 2);
        structurePrompt = `
Structure the following content into a well-organized document format with title, sections, and subsections.

Content: ${rawContent}

Return ONLY a valid JSON object that matches this schema:
${schema}

Ensure all sections have meaningful headings and well-organized content.
`;
        break;

      case "table":
        schema = JSON.stringify(TableStructureSchema.shape, null, 2);
        structurePrompt = `
Structure the following content into a table format with headers and rows.

Content: ${rawContent}

Return ONLY a valid JSON object that matches this schema:
${schema}

Extract tabular data and organize it with appropriate headers and rows.
`;
        break;

      case "report":
        schema = JSON.stringify(ReportStructureSchema.shape, null, 2);
        structurePrompt = `
Structure the following content into a formal report format with executive summary, findings, and recommendations.

Content: ${rawContent}

Return ONLY a valid JSON object that matches this schema:
${schema}

Create a comprehensive report structure with all required sections.
`;
        break;
    }

    const response = await this.llm.invoke([
      new SystemMessage(
        "You are an expert document structurer. Convert content into structured JSON format. Return ONLY valid JSON, no additional text."
      ),
      new HumanMessage(structurePrompt),
    ]);

    const responseText = response.content as string;

    // Clean the response to extract only JSON
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No valid JSON found in response");
    }

    const structuredData = JSON.parse(jsonMatch[0]);

    // Validate against appropriate schema
    let validatedData;
    switch (documentType) {
      case "document":
        validatedData = DocumentStructureSchema.parse(structuredData);
        break;
      case "table":
        validatedData = TableStructureSchema.parse(structuredData);
        break;
      case "report":
        validatedData = ReportStructureSchema.parse(structuredData);
        break;
      default:
        throw new Error("Invalid document type");
    }

    return validatedData;
  }

  private formatOutput(
    documentType: "document" | "table" | "report",
    structuredData: DocumentStructure | TableStructure | ReportStructure
  ): string {
    switch (documentType) {
      case "document":
        return this.formatDocumentStructure(
          structuredData as DocumentStructure
        );
      case "table":
        return this.formatTableStructure(structuredData as TableStructure);
      case "report":
        return this.formatReportStructure(structuredData as ReportStructure);
      default:
        throw new Error("Invalid document type");
    }
  }

  private formatDocumentStructure(data: DocumentStructure): string {
    let output = `# ${data.title}\n\n`;

    if (data.metadata) {
      output += "## Document Information\n";
      if (data.metadata.author)
        output += `**Author:** ${data.metadata.author}\n`;
      if (data.metadata.date) output += `**Date:** ${data.metadata.date}\n`;
      if (data.metadata.category)
        output += `**Category:** ${data.metadata.category}\n`;
      if (data.metadata.tags)
        output += `**Tags:** ${data.metadata.tags.join(", ")}\n`;
      output += "\n";
    }

    data.sections.forEach((section) => {
      output += `## ${section.heading}\n\n${section.content}\n\n`;

      if (section.subsections) {
        section.subsections.forEach((subsection) => {
          output += `### ${subsection.heading}\n\n${subsection.content}\n\n`;

          if (subsection.bulletPoints) {
            subsection.bulletPoints.forEach((point) => {
              output += `• ${point}\n`;
            });
            output += "\n";
          }
        });
      }
    });

    return output;
  }

  private formatTableStructure(data: TableStructure): string {
    let output = `# ${data.title}\n\n`;

    if (data.summary) {
      output += `${data.summary}\n\n`;
    }

    // Create table header
    output += `| ${data.headers.join(" | ")} |\n`;
    output += `| ${data.headers.map(() => "---").join(" | ")} |\n`;

    // Add table rows
    data.rows.forEach((row) => {
      output += `| ${row.join(" | ")} |\n`;
    });

    return output;
  }

  async format(input: string): Promise<string> {
    try {
      // Step 1: Analyze content
      const { documentType, rawContent } = await this.analyzeContent(input);

      // Step 2: Structure data
      const structuredData = await this.structureData(documentType, rawContent);

      // Step 3: Format output
      const formattedOutput = this.formatOutput(documentType, structuredData);

      return formattedOutput;
    } catch (error) {
      throw new Error(
        `Document formatting failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  private formatReportStructure(data: ReportStructure): string {
    let output = `# ${data.title}\n\n`;

    if (data.executive_summary) {
      output += `## Executive Summary\n${data.executive_summary}\n\n`;
    }

    if (data.introduction) {
      output += `## Introduction\n${data.introduction}\n\n`;
    }

    if (data.methodology) {
      output += `## Methodology\n${data.methodology}\n\n`;
    }

    if (data.findings && data.findings.length > 0) {
      output += `## Findings\n`;
      data.findings.forEach((finding, index) => {
        output += `### ${finding.title}\n${finding.description}\n`;
        if (finding.data && finding.data.length > 0) {
          output += `\n`;
          finding.data.forEach((item) => {
            output += `- **${item.label}**: ${item.value}\n`;
          });
        }
        output += `\n`;
      });
    }

    if (data.conclusions) {
      output += `## Conclusions\n${data.conclusions}\n\n`;
    }

    if (data.recommendations && data.recommendations.length > 0) {
      output += `## Recommendations\n`;
      data.recommendations.forEach((recommendation, index) => {
        output += `${index + 1}. ${recommendation}\n`;
      });
    }

    return output;
  }

  async formatDocument(input: string): Promise<{
    success: boolean;
    data?: {
      documentType: string;
      structuredData: DocumentStructure | TableStructure | ReportStructure;
      formattedOutput: string;
    };
    error?: string;
  }> {
    try {
      // Analyze content to determine document type
      const analysis = await this.analyzeContent(input);

      // Structure the data based on document type
      const structuredData = await this.structureData(
        analysis.documentType,
        analysis.rawContent
      );

      // Format the output
      const formattedOutput = this.formatOutput(
        analysis.documentType,
        structuredData
      );

      return {
        success: true,
        data: {
          documentType: analysis.documentType,
          structuredData,
          formattedOutput,
        },
      };
    } catch (error) {
      return {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  }
}

export const aiDocumentFormatter = new AIDocumentFormatter();
