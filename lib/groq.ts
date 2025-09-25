import Groq from 'groq-sdk'
import { documentAgent } from './agent';

// Initialize Groq client
const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY!,
})

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string | Array<{
    type: 'text' | 'image_url'
    text?: string
    image_url?: {
      url: string
    }
  }>
}

export interface ChatCompletionOptions {
  model?: string
  temperature?: number
  max_tokens?: number
  top_p?: number
  stream?: boolean
}

/**
 * Generate chat completion using Groq
 */
export async function generateChatCompletion(
  messages: ChatMessage[],
  options: ChatCompletionOptions = {}
): Promise<string> {
  try {
    const {
      model = 'llama-3.3-70b-versatile',
      temperature = 0.7,
      max_tokens = 1024,
      top_p = 1,
      stream = false,
    } = options

    const completion = await groq.chat.completions.create({
      model,
      messages: messages as any,
      temperature,
      max_completion_tokens: max_tokens,
      top_p,
      stream: false, // Ensure we get a non-streaming response
    })

    // Type assertion to handle the union type
    const chatCompletion = completion as any
    return chatCompletion.choices[0]?.message?.content || 'No response generated'
  } catch (error) {
    console.error('Error generating chat completion:', error)
    throw new Error('Failed to generate AI response')
  }
}

/**
 * Perform OCR on an image using Groq's vision model
 */
export async function performOCR(
  imageUrl: string,
  prompt: string = "Extract all text from this image. Provide the text content in a clear, structured format."
): Promise<string> {
  try {
    const messages: ChatMessage[] = [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: prompt,
          },
          {
            type: 'image_url',
            image_url: {
              url: imageUrl,
            },
          },
        ],
      },
    ]

    const completion = await groq.chat.completions.create({
      model: 'llama-3.2-90b-vision-preview', // Vision model for OCR
      messages: messages as any,
      temperature: 0.1, // Lower temperature for more accurate OCR
      max_completion_tokens: 2048,
      top_p: 1,
      stream: false,
    })

    // Type assertion to handle the union type
    const chatCompletion = completion as any
    return chatCompletion.choices[0]?.message?.content || 'No text extracted'
  } catch (error) {
    console.error('Error performing OCR:', error)
    throw new Error('Failed to extract text from image')
  }
}

/**
 * Analyze document content and generate insights
 */
export async function analyzeDocument(
  content: string,
  analysisType: 'summary' | 'key_points' | 'questions' | 'custom' = 'summary',
  customPrompt?: string
): Promise<string> {
  try {
    let systemPrompt = ''
    let userPrompt = ''

    switch (analysisType) {
      case 'summary':
        systemPrompt = 'You are a document analysis expert. Provide clear, concise summaries of documents.'
        userPrompt = `Please provide a comprehensive summary of the following document content:\n\n${content}`
        break
      case 'key_points':
        systemPrompt = 'You are a document analysis expert. Extract key points and important information from documents.'
        userPrompt = `Please extract the key points and important information from the following document:\n\n${content}`
        break
      case 'questions':
        systemPrompt = 'You are a document analysis expert. Generate relevant questions based on document content.'
        userPrompt = `Based on the following document content, generate relevant questions that could help with understanding or further exploration:\n\n${content}`
        break
      case 'custom':
        systemPrompt = 'You are a helpful document analysis assistant.'
        userPrompt = customPrompt || `Analyze the following document content:\n\n${content}`
        break
    }

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ]

    return await generateChatCompletion(messages, {
      temperature: 0.3,
      max_tokens: 1500,
    })
  } catch (error) {
    console.error('Error analyzing document:', error)
    throw new Error('Failed to analyze document')
  }
}

/**
 * Generate document based on template and user input
 */
export async function generateDocument(
  templateType: string,
  formData: Record<string, any>,
  additionalInstructions?: string
): Promise<string> {
  try {
    const systemPrompt = `You are a professional document generator. Create well-formatted, professional documents based on the template type and provided data. Ensure the document is complete, properly structured, and ready for use.`
    
    const userPrompt = `Generate a ${templateType} document using the following information:
    
${Object.entries(formData).map(([key, value]) => `${key}: ${value}`).join('\n')}

${additionalInstructions ? `Additional instructions: ${additionalInstructions}` : ''}

Please create a complete, professional document that includes all necessary sections and formatting.`

    const messages: ChatMessage[] = [
      {
        role: 'system',
        content: systemPrompt,
      },
      {
        role: 'user',
        content: userPrompt,
      },
    ]

    return await generateChatCompletion(messages, {
      temperature: 0.2,
      max_tokens: 2048,
    })
  } catch (error) {
    console.error('Error generating document:', error)
    throw new Error('Failed to generate document')
  }
}

export async function generateChatWithAgent(
  query: string,
  userId: string,
  sessionId?: string,
  useSemanticSearch: boolean = false,
  documentIds?: string[],
  conversationContext?: string
): Promise<{ response: string; referencedDocuments: string[] }> {
  try {
    return await documentAgent.processQuery({
      query,
      userId,
      sessionId,
      useSemanticSearch,
      documentIds,
      conversationContext
    });
  } catch (error) {
    console.error('Error generating chat with agent:', error);
    throw error;
  }
}

export { groq }