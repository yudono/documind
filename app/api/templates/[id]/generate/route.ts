import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { LangGraphDocumentAgent } from '@/lib/agent-langgraph';
import { generateTextDocument, validateFormData, TemplateField } from '@/lib/template-processor';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Get the template
    const template = await prisma.template.findUnique({
      where: { id: params.id },
    });

    if (!template) {
      return NextResponse.json(
        { error: 'Template not found' },
        { status: 404 }
      );
    }

    // Check if template is public or belongs to the user
    if (!template.isPublic && template.userId !== user.id) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { formData, useAI = false } = body;

    if (!formData || typeof formData !== 'object') {
      return NextResponse.json(
        { error: 'Form data is required' },
        { status: 400 }
      );
    }

    // Validate required fields
    const templateFields = (template.templateFields as unknown as TemplateField[]) || [];
    const validation = validateFormData(formData, templateFields);
    
    if (!validation.isValid) {
      return NextResponse.json(
        { error: validation.errors[0] },
        { status: 400 }
      );
    }

    // Create template generation record
    const templateGeneration = await prisma.templateGeneration.create({
      data: {
        templateId: template.id,
        userId: user.id,
        formData: formData,
        status: 'processing',
        aiEnhanced: useAI,
      },
    });

    try {
      let processedContent = '';
      let aiEnhancedData = formData;

      // If AI enhancement is requested, use the AI agent
      if (useAI) {
        const agent = new LangGraphDocumentAgent();
        
        // Create a prompt for AI enhancement
        const enhancementPrompt = `
          Please enhance the following form data for a ${template.name} document:
          
          Template Description: ${template.description}
          Form Data: ${JSON.stringify(formData, null, 2)}
          
          Please provide enhanced, professional, and contextually appropriate content for each field while maintaining the original intent and information.
          Return the enhanced data in the same JSON structure.
        `;

        const aiResponse = await agent.processQuery({
          query: enhancementPrompt,
          userId: user.id,
          useSemanticSearch: false,
        });
        
        // Try to parse AI response as JSON, fallback to original data if parsing fails
        try {
          const aiResponseText = aiResponse.response || aiResponse.toString();
          // Extract JSON from AI response (it might be wrapped in markdown or other text)
          const jsonMatch = aiResponseText.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            aiEnhancedData = JSON.parse(jsonMatch[0]);
          }
        } catch (parseError) {
          console.warn('Failed to parse AI enhanced data, using original:', parseError);
          aiEnhancedData = formData;
        }
      }

      // Process template content with placeholder replacement
      processedContent = generateTextDocument(
        template.name,
        template.description || '',
        aiEnhancedData,
        templateFields
      );

      // Update the generation record with success
      const updatedGeneration = await prisma.templateGeneration.update({
        where: { id: templateGeneration.id },
        data: {
          status: 'completed',
          documentUrl: 'generated-content', // In a real app, this would be a file URL
        },
        include: {
          template: true,
        },
      });

      return NextResponse.json({
        success: true,
        generation: updatedGeneration,
        content: processedContent,
      });

    } catch (processingError) {
      console.error('Error processing template:', processingError);
      
      // Update the generation record with error
      await prisma.templateGeneration.update({
        where: { id: templateGeneration.id },
        data: {
          status: 'failed',
        },
      });

      return NextResponse.json(
        { error: 'Failed to process template' },
        { status: 500 }
      );
    }

  } catch (error) {
    console.error('Error generating document from template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}