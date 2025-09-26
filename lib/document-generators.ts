import jsPDF from 'jspdf';
import { Document, Packer, Paragraph, TextRun } from 'docx';
import * as XLSX from 'xlsx';

export interface DocumentGenerationResult {
  name: string;
  type: string;
  size: number;
  url: string;
  content: string;
  generatedAt: string;
}

export class DocumentGenerators {
  
  /**
   * Generate a PDF document from text content
   */
  static async generatePDF(content: string, filename: string = 'document'): Promise<DocumentGenerationResult> {
    try {
      const doc = new jsPDF();
      
      // Set font and size
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      
      // Split content into lines that fit the page width
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const maxLineWidth = pageWidth - (margin * 2);
      
      const lines = doc.splitTextToSize(content, maxLineWidth);
      
      // Add text to PDF with proper line spacing
      let yPosition = margin;
      const lineHeight = 7;
      
      for (let i = 0; i < lines.length; i++) {
        // Check if we need a new page
        if (yPosition > doc.internal.pageSize.getHeight() - margin) {
          doc.addPage();
          yPosition = margin;
        }
        
        doc.text(lines[i], margin, yPosition);
        yPosition += lineHeight;
      }
      
      // Generate PDF as data URL
      const pdfDataUrl = doc.output('dataurlstring');
      const pdfSize = Math.round(pdfDataUrl.length * 0.75); // Approximate size
      
      return {
        name: `${filename}.pdf`,
        type: 'application/pdf',
        size: pdfSize,
        url: pdfDataUrl,
        content: content,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw new Error('Failed to generate PDF document');
    }
  }

  /**
   * Generate a DOCX document from text content
   */
  static async generateDOCX(content: string, filename: string = 'document'): Promise<DocumentGenerationResult> {
    try {
      // Split content into paragraphs
      const paragraphs = content.split('\n').filter(line => line.trim() !== '');
      
      // Create document with paragraphs
      const doc = new Document({
        sections: [{
          properties: {},
          children: paragraphs.map(paragraph => 
            new Paragraph({
              children: [
                new TextRun({
                  text: paragraph,
                  font: 'Arial',
                  size: 24, // 12pt font (size is in half-points)
                })
              ],
              spacing: {
                after: 200, // Add space after each paragraph
              }
            })
          )
        }]
      });

      // Generate DOCX as buffer
      const buffer = await Packer.toBuffer(doc);
      
      // Convert buffer to data URL
      const base64 = buffer.toString('base64');
      const docxDataUrl = `data:application/vnd.openxmlformats-officedocument.wordprocessingml.document;base64,${base64}`;
      
      return {
        name: `${filename}.docx`,
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        size: buffer.length,
        url: docxDataUrl,
        content: content,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating DOCX:', error);
      throw new Error('Failed to generate DOCX document');
    }
  }

  /**
   * Generate an XLSX document from text content (converts to table format)
   */
  static async generateXLSX(content: string, filename: string = 'document'): Promise<DocumentGenerationResult> {
    try {
      // Parse content into rows and columns
      const lines = content.split('\n').filter(line => line.trim() !== '');
      
      // Create worksheet data
      const worksheetData: any[][] = [];
      
      // Add header
      worksheetData.push(['Content']);
      
      // Add content lines as rows
      lines.forEach(line => {
        // Try to detect if line contains tabular data (comma or tab separated)
        if (line.includes('\t') || line.includes(',')) {
          const separator = line.includes('\t') ? '\t' : ',';
          const cells = line.split(separator).map(cell => cell.trim());
          worksheetData.push(cells);
        } else {
          worksheetData.push([line]);
        }
      });
      
      // Create workbook and worksheet
      const workbook = XLSX.utils.book_new();
      const worksheet = XLSX.utils.aoa_to_sheet(worksheetData);
      
      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Document');
      
      // Generate XLSX as buffer
      const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // Convert buffer to data URL
      const base64 = buffer.toString('base64');
      const xlsxDataUrl = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${base64}`;
      
      return {
        name: `${filename}.xlsx`,
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        size: buffer.length,
        url: xlsxDataUrl,
        content: content,
        generatedAt: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error generating XLSX:', error);
      throw new Error('Failed to generate XLSX document');
    }
  }

  /**
   * Detect document type from AI response and generate appropriate document
   */
  static async generateDocumentFromAIResponse(
    aiResponse: string, 
    filename: string = 'ai-generated-document'
  ): Promise<DocumentGenerationResult | null> {
    try {
      // Analyze AI response to determine if document generation is needed
      const lowerResponse = aiResponse.toLowerCase();
      
      // Check for document generation indicators
      const documentIndicators = [
        'here is the document',
        'here\'s the document',
        'generated document',
        'document content',
        'report:',
        'summary:',
        'analysis:',
        'proposal:',
        'contract:',
        'agreement:',
        'letter:',
        'memo:',
        'invoice:',
        'receipt:',
        'table:',
        'spreadsheet',
        'data analysis',
        'financial report',
        'business plan'
      ];
      
      const shouldGenerateDocument = documentIndicators.some(indicator => 
        lowerResponse.includes(indicator)
      );
      
      if (!shouldGenerateDocument) {
        return null;
      }
      
      // Determine document type based on content
      let documentType: 'pdf' | 'docx' | 'xlsx' = 'pdf'; // default
      
      if (lowerResponse.includes('spreadsheet') || 
          lowerResponse.includes('table') || 
          lowerResponse.includes('data analysis') ||
          lowerResponse.includes('financial report')) {
        documentType = 'xlsx';
      } else if (lowerResponse.includes('document') || 
                 lowerResponse.includes('letter') || 
                 lowerResponse.includes('contract') ||
                 lowerResponse.includes('agreement') ||
                 lowerResponse.includes('proposal')) {
        documentType = 'docx';
      }
      
      // Generate document based on detected type
      switch (documentType) {
        case 'pdf':
          return await this.generatePDF(aiResponse, filename);
        case 'docx':
          return await this.generateDOCX(aiResponse, filename);
        case 'xlsx':
          return await this.generateXLSX(aiResponse, filename);
        default:
          return await this.generatePDF(aiResponse, filename);
      }
    } catch (error) {
      console.error('Error generating document from AI response:', error);
      return null;
    }
  }
}