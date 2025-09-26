#!/usr/bin/env tsx

/**
 * Test Runner for AI Document Generation System
 * 
 * This script runs comprehensive tests for the AI-powered document generation
 * system including all components and integration tests.
 * 
 * Usage:
 *   npx tsx scripts/test-ai-document-generation.ts
 *   or
 *   npm run test:ai-docs
 */

import { runAIDocumentGenerationTests } from '../__tests__/ai-document-generation.test';

async function main() {
  console.log('🚀 AI Document Generation Test Runner');
  console.log('=====================================\n');
  
  try {
    const results = await runAIDocumentGenerationTests();
    
    // Exit with appropriate code
    const allPassed = Object.values(results).every(result => result.success);
    process.exit(allPassed ? 0 : 1);
    
  } catch (error) {
    console.error('❌ Test runner failed:', error);
    process.exit(1);
  }
}

// Run the tests if this script is executed directly
if (require.main === module) {
  main();
}