import pdfParse from 'pdf-parse'
import mammoth from 'mammoth'
import * as XLSX from 'xlsx'

export interface ParsedDocument {
  text: string
  metadata?: {
    pages?: number
    wordCount?: number
    title?: string
    author?: string
  }
}

/**
 * Parse PDF files to extract text
 */
export async function parsePDF(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const data = await pdfParse(buffer)
    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        wordCount: data.text.split(/\s+/).length,
        title: data.info?.Title,
        author: data.info?.Author,
      }
    }
  } catch (error) {
    console.error('Error parsing PDF:', error)
    throw new Error('Failed to parse PDF document')
  }
}

/**
 * Parse DOCX files to extract text
 */
export async function parseDOCX(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer })
    const text = result.value
    return {
      text,
      metadata: {
        wordCount: text.split(/\s+/).length,
      }
    }
  } catch (error) {
    console.error('Error parsing DOCX:', error)
    throw new Error('Failed to parse DOCX document')
  }
}

/**
 * Parse Excel files (XLSX, XLS) to extract text
 */
export async function parseExcel(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const workbook = XLSX.read(buffer, { type: 'buffer' })
    let allText = ''
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName]
      const sheetText = XLSX.utils.sheet_to_txt(worksheet)
      allText += `Sheet: ${sheetName}\n${sheetText}\n\n`
    })
    
    return {
      text: allText.trim(),
      metadata: {
        wordCount: allText.split(/\s+/).length,
      }
    }
  } catch (error) {
    console.error('Error parsing Excel:', error)
    throw new Error('Failed to parse Excel document')
  }
}

/**
 * Parse PowerPoint files (PPTX) to extract text
 */
export async function parsePPTX(buffer: Buffer): Promise<ParsedDocument> {
  try {
    // For PPTX, we'll use a simple approach to extract text
    // This is a basic implementation - for production, consider using a more robust library
    const JSZip = (await import('jszip')).default
    const zip = await JSZip.loadAsync(buffer)
    
    let allText = ''
    const slideFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('ppt/slides/slide') && name.endsWith('.xml')
    )
    
    for (const slideFile of slideFiles) {
      const slideContent = await zip.files[slideFile].async('text')
      // Extract text between <a:t> tags (text runs in PowerPoint)
      const textMatches = slideContent.match(/<a:t[^>]*>([^<]*)<\/a:t>/g)
      if (textMatches) {
        const slideText = textMatches
          .map(match => match.replace(/<a:t[^>]*>([^<]*)<\/a:t>/, '$1'))
          .join(' ')
        allText += slideText + '\n'
      }
    }
    
    return {
      text: allText.trim(),
      metadata: {
        wordCount: allText.split(/\s+/).length,
      }
    }
  } catch (error) {
    console.error('Error parsing PPTX:', error)
    throw new Error('Failed to parse PPTX document')
  }
}

/**
 * Parse document based on file type
 */
export async function parseDocument(buffer: Buffer, mimeType: string, fileName: string): Promise<ParsedDocument> {
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  switch (mimeType) {
    case 'application/pdf':
      return parsePDF(buffer)
    
    case 'application/vnd.openxmlformats-officedocument.wordprocessingml.document':
      return parseDOCX(buffer)
    
    case 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
    case 'application/vnd.ms-excel':
      return parseExcel(buffer)
    
    case 'application/vnd.openxmlformats-officedocument.presentationml.presentation':
      return parsePPTX(buffer)
    
    default:
      // Fallback based on file extension
      switch (extension) {
        case 'pdf':
          return parsePDF(buffer)
        case 'docx':
          return parseDOCX(buffer)
        case 'xlsx':
        case 'xls':
          return parseExcel(buffer)
        case 'pptx':
          return parsePPTX(buffer)
        default:
          throw new Error(`Unsupported document type: ${mimeType} (${extension})`)
      }
  }
}

/**
 * Get supported file types
 */
export function getSupportedFileTypes(): string[] {
  return [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ]
}

/**
 * Check if file type is supported for parsing
 */
export function isDocumentSupported(mimeType: string, fileName: string): boolean {
  const supportedTypes = getSupportedFileTypes()
  const extension = fileName.split('.').pop()?.toLowerCase()
  
  return supportedTypes.includes(mimeType) || 
         ['pdf', 'docx', 'xlsx', 'xls', 'pptx'].includes(extension || '')
}