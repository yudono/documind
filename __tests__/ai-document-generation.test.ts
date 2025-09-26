/**
 * AI Document Generation Test Suite
 * 
 * This test suite validates the AI-powered document generation system
 * including AI formatting, document parsing, and PDF generation.
 */

import { AIDocumentFormatter } from '@/lib/ai-document-formatter';
import { DocumentFormatParser } from '@/lib/document-format-parser';
import { EnhancedPDFGenerator } from '@/lib/enhanced-pdf-generator';

// Test data constants
const SAMPLE_CONTENT = `
# Test Document

## Introduction
This is a test document for validating our AI document generation system.

### Key Features
- AI-powered content formatting
- Multiple output formats (PDF, XLSX, HTML)
- Advanced document parsing
- Template-based generation

## Data Analysis
| Metric | Value | Status |
|--------|-------|--------|
| Tests | 25 | Passing |
| Coverage | 95% | Good |
| Performance | <100ms | Excellent |

## Conclusion
The system successfully processes and formats documents using AI.
`;

const SAMPLE_JSON_DOCUMENT = {
  metadata: {
    title: 'Test Report',
    author: 'AI System',
    date: '2024-01-01',
    category: 'testing'
  },
  elements: [
    {
      type: 'header',
      content: 'Executive Summary',
      level: 1,
      style: { fontSize: 18, fontWeight: 'bold' }
    },
    {
      type: 'text',
      content: 'This report demonstrates the AI document generation capabilities.',
      style: { fontSize: 12 }
    },
    {
      type: 'list',
      listType: 'unordered',
      items: ['Feature 1', 'Feature 2', 'Feature 3'],
      style: { indentation: 20 }
    }
  ]
};

/**
 * Test the AI Document Formatter
 */
async function testAIDocumentFormatter() {
  console.log('🧪 Testing AI Document Formatter...');
  
  try {
    const formatter = new AIDocumentFormatter();
    
    // Test the main format method
    console.log('  ✓ Testing format method...');
    const formattedContent = await formatter.format(SAMPLE_CONTENT);
    
    if (!formattedContent || typeof formattedContent !== 'string') {
      throw new Error('Format method should return a string');
    }
    
    console.log('  ✓ AI formatting completed successfully');
    console.log(`  ✓ Generated ${formattedContent.length} characters of formatted content`);
    
    return { success: true, formattedContent };
  } catch (error) {
    console.error('  ❌ AI Document Formatter test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Test the Document Format Parser
 */
function testDocumentFormatParser() {
  console.log('🧪 Testing Document Format Parser...');
  
  try {
    const parser = new DocumentFormatParser();
    
    // Test markdown parsing
    console.log('  ✓ Testing markdown parsing...');
    const markdownResult = parser.parseMarkdown(SAMPLE_CONTENT);
    
    if (!markdownResult.elements || markdownResult.elements.length === 0) {
      throw new Error('Markdown parsing should return elements');
    }
    
    console.log(`  ✓ Parsed ${markdownResult.elements.length} elements from markdown`);
    
    // Test JSON parsing
    console.log('  ✓ Testing JSON parsing...');
    const jsonResult = parser.parseJSON(JSON.stringify(SAMPLE_JSON_DOCUMENT));
    
    if (!jsonResult.metadata || !jsonResult.elements) {
      throw new Error('JSON parsing should return metadata and elements');
    }
    
    console.log(`  ✓ Parsed JSON document with ${jsonResult.elements.length} elements`);
    
    // Test plain text parsing
    console.log('  ✓ Testing plain text parsing...');
    const plainTextResult = parser.parsePlainText('Simple plain text content', {
      title: 'Plain Text Test',
      author: 'Test Suite'
    });
    
    if (!plainTextResult.elements || plainTextResult.elements.length !== 1) {
      throw new Error('Plain text parsing should return one element');
    }
    
    console.log('  ✓ Plain text parsing completed');
    
    // Test auto-detection
    console.log('  ✓ Testing auto-detection...');
    const autoResult = parser.parse(SAMPLE_CONTENT);
    
    if (!autoResult.elements || autoResult.elements.length === 0) {
      throw new Error('Auto-detection should return elements');
    }
    
    console.log(`  ✓ Auto-detected and parsed ${autoResult.elements.length} elements`);
    
    // Test markdown conversion
    console.log('  ✓ Testing markdown conversion...');
    const convertedMarkdown = parser.toMarkdown(jsonResult);
    
    if (!convertedMarkdown || typeof convertedMarkdown !== 'string') {
      throw new Error('Markdown conversion should return a string');
    }
    
    console.log('  ✓ Document converted back to markdown');
    
    return { 
      success: true, 
      results: {
        markdown: markdownResult,
        json: jsonResult,
        plainText: plainTextResult,
        auto: autoResult,
        converted: convertedMarkdown
      }
    };
  } catch (error) {
    console.error('  ❌ Document Format Parser test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Test the Enhanced PDF Generator
 */
async function testEnhancedPDFGenerator() {
  console.log('🧪 Testing Enhanced PDF Generator...');
  
  try {
    const generator = new EnhancedPDFGenerator();
    
    // Test basic PDF generation
    console.log('  ✓ Testing basic PDF generation...');
    const basicOptions = {
      title: 'Test Document',
      author: 'Test Suite',
      content: SAMPLE_CONTENT,
      useAIFormatting: false
    };
    
    const basicPDF = await generator.generatePDF(basicOptions);
    
    if (!basicPDF || !Buffer.isBuffer(basicPDF)) {
      throw new Error('PDF generation should return a Buffer');
    }
    
    console.log(`  ✓ Generated basic PDF (${basicPDF.length} bytes)`);
    
    // Test AI-formatted PDF generation
    console.log('  ✓ Testing AI-formatted PDF generation...');
    const aiOptions = {
       title: 'AI-Formatted Test Document',
       author: 'AI Test Suite',
       content: 'Raw content to be formatted by AI',
       useAIFormatting: true,
       fontSize: 12,
       fontFamily: 'Arial',
       margins: { top: 20, right: 20, bottom: 20, left: 20 },
       pageSize: 'a4' as const,
       orientation: 'portrait' as const,
       includeHeader: true,
       headerText: 'AI Document Generation Test'
     };
    
    const aiPDF = await generator.generatePDF(aiOptions);
    
    if (!aiPDF || !Buffer.isBuffer(aiPDF)) {
      throw new Error('AI PDF generation should return a Buffer');
    }
    
    console.log(`  ✓ Generated AI-formatted PDF (${aiPDF.length} bytes)`);
    
    return { 
      success: true, 
      results: {
        basicPDF: basicPDF.length,
        aiPDF: aiPDF.length
      }
    };
  } catch (error) {
    console.error('  ❌ Enhanced PDF Generator test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Integration test for the complete workflow
 */
async function testIntegrationWorkflow() {
  console.log('🧪 Testing Integration Workflow...');
  
  try {
    const formatter = new AIDocumentFormatter();
    const parser = new DocumentFormatParser();
    const generator = new EnhancedPDFGenerator();
    
    console.log('  ✓ Step 1: AI formatting...');
    const formattedContent = await formatter.format(SAMPLE_CONTENT);
    
    console.log('  ✓ Step 2: Document parsing...');
    const parsedDocument = parser.parseMarkdown(formattedContent);
    
    console.log('  ✓ Step 3: PDF generation...');
    const pdfBuffer = await generator.generatePDF({
      title: 'Integration Test Document',
      author: 'Integration Test Suite',
      content: formattedContent,
      useAIFormatting: false, // Already formatted
      fontSize: 11,
      margins: { top: 25, right: 25, bottom: 25, left: 25 }
    });
    
    console.log('  ✓ Integration workflow completed successfully');
    
    return {
      success: true,
      results: {
        formattedContentLength: formattedContent.length,
        parsedElementsCount: parsedDocument.elements.length,
        pdfSize: pdfBuffer.length
      }
    };
  } catch (error) {
    console.error('  ❌ Integration workflow test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Performance test for large documents
 */
async function testPerformance() {
  console.log('🧪 Testing Performance...');
  
  try {
    const parser = new DocumentFormatParser();
    
    // Generate large content
    const largeContent = SAMPLE_CONTENT.repeat(100); // ~50KB of content
    
    console.log('  ✓ Testing large document parsing...');
    const startTime = Date.now();
    const result = parser.parsePlainText(largeContent);
    const endTime = Date.now();
    
    const processingTime = endTime - startTime;
    
    if (processingTime > 5000) { // 5 seconds threshold
      throw new Error(`Processing took too long: ${processingTime}ms`);
    }
    
    console.log(`  ✓ Processed ${largeContent.length} characters in ${processingTime}ms`);
    
    return {
      success: true,
      results: {
        contentSize: largeContent.length,
        processingTime,
        elementsCount: result.elements.length
      }
    };
  } catch (error) {
    console.error('  ❌ Performance test failed:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

/**
 * Main test runner
 */
export async function runAIDocumentGenerationTests() {
  console.log('🚀 Starting AI Document Generation Test Suite\n');
  
  const results = {
    aiFormatter: await testAIDocumentFormatter(),
    documentParser: testDocumentFormatParser(),
    pdfGenerator: await testEnhancedPDFGenerator(),
    integration: await testIntegrationWorkflow(),
    performance: await testPerformance()
  };
  
  console.log('\n📊 Test Results Summary:');
  console.log('========================');
  
  let passedTests = 0;
  let totalTests = 0;
  
  Object.entries(results).forEach(([testName, result]) => {
    totalTests++;
    if (result.success) {
      passedTests++;
      console.log(`✅ ${testName}: PASSED`);
    } else {
      console.log(`❌ ${testName}: FAILED - ${result.error}`);
    }
  });
  
  console.log(`\n🎯 Overall: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 All tests passed! AI Document Generation system is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Please review the errors above.');
  }
  
  return results;
}

// Export individual test functions for modular testing
export {
  testAIDocumentFormatter,
  testDocumentFormatParser,
  testEnhancedPDFGenerator,
  testIntegrationWorkflow,
  testPerformance
};