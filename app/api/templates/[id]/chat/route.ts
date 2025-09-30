import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user by email since session.user.id might not be available
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { formData } = await request.json();
    const templateId = params.id;

    // Get template with AI prompt - fetch all fields to avoid type issues
    const template = await prisma.template.findUnique({
      where: { id: templateId },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if template has AI prompt configured
    const aiPrompt = template.aiPrompt;
    if (!aiPrompt) {
      return NextResponse.json(
        { error: 'Template does not have AI prompt configured' },
        { status: 400 }
      );
    }

    // Create a new chat session for this template generation
    const chatSession = await prisma.chatSession.create({
      data: {
        title: `Generate ${template.name}`,
        userId: user.id,
      },
    });

    // Process the AI prompt by replacing placeholders with form data
    let processedPrompt = aiPrompt;
    
    // Replace placeholders in the format {{fieldName}} with actual values
    Object.entries(formData).forEach(([key, value]) => {
      const placeholder = `{{${key}}}`;
      processedPrompt = processedPrompt.replace(
        new RegExp(placeholder, 'g'),
        String(value)
      );
    });

    // Create initial system message with the processed prompt
    await prisma.chatMessage.create({
      data: {
        content: processedPrompt,
        role: 'user',
        sessionId: chatSession.id,
      },
    });

    return NextResponse.json({
      success: true,
      chatSessionId: chatSession.id,
      processedPrompt,
    });
  } catch (error) {
    console.error('Error creating template chat session:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}