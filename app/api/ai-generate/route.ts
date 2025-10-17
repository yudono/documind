import { NextRequest, NextResponse } from 'next/server';
import Groq from 'groq-sdk';

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

const documentPrompts = {
  document: (prompt: string) => `
You are a professional document writer. Create a comprehensive, well-structured document based on the following request:

${prompt}

Please format the response as HTML that can be directly inserted into a rich text editor. Use proper heading tags (h1, h2, h3, etc.), paragraphs, lists, and other HTML elements as appropriate. Make the document professional, detailed, and well-organized.

Do not include any markdown formatting - only HTML tags. Start directly with the content without any preamble.
`,

  business_proposal: (prompt: string) => `
You are a business consultant creating a professional business proposal. Based on the following requirements:

${prompt}

Create a comprehensive business proposal with the following structure:
1. Executive Summary
2. Problem Statement
3. Proposed Solution
4. Implementation Timeline
5. Budget and Investment
6. Expected Outcomes
7. Next Steps

Format the response as HTML with proper headings, paragraphs, and lists. Make it professional and persuasive.
`,

  project_report: (prompt: string) => `
You are a project manager creating a detailed project report. Based on the following requirements:

${prompt}

Create a comprehensive project report with the following structure:
1. Project Overview
2. Objectives and Goals
3. Current Status
4. Key Achievements
5. Challenges and Risks
6. Resource Utilization
7. Timeline and Milestones
8. Recommendations
9. Conclusion

Format the response as HTML with proper headings, paragraphs, tables, and lists as appropriate.
`,

  meeting_minutes: (prompt: string) => `
You are a professional secretary creating meeting minutes. Based on the following meeting details:

${prompt}

Create structured meeting minutes with the following format:
1. Meeting Information (Date, Time, Attendees, Location)
2. Agenda Items
3. Discussion Points
4. Decisions Made
5. Action Items (with assigned responsibilities and deadlines)
6. Next Meeting

Format the response as HTML with proper headings, paragraphs, and lists.
`,

  email_template: (prompt: string) => `
You are a professional communication specialist creating an email template. Based on the following requirements:

${prompt}

Create a professional email template with:
1. Appropriate subject line
2. Professional greeting
3. Clear and concise body content
4. Call to action (if applicable)
5. Professional closing

Format the response as HTML with proper paragraphs and formatting.
`,

  research_paper: (prompt: string) => `
You are an academic researcher creating a research paper structure. Based on the following topic:

${prompt}

Create a comprehensive research paper outline with:
1. Abstract
2. Introduction
3. Literature Review
4. Methodology
5. Results and Analysis
6. Discussion
7. Conclusion
8. References (placeholder structure)

Format the response as HTML with proper academic formatting, headings, and structure.
`,

  creative_writing: (prompt: string) => `
You are a creative writer helping to develop content. Based on the following creative brief:

${prompt}

Create engaging, creative content that captures the essence of the request. Use vivid descriptions, compelling narrative, and appropriate tone for the content type.

Format the response as HTML with proper paragraphs and formatting to enhance readability.
`,
};

export async function POST(request: NextRequest) {
  try {
    const { prompt, type } = await request.json();

    if (!prompt || !type) {
      return NextResponse.json(
        { error: 'Prompt and type are required' },
        { status: 400 }
      );
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json(
        { error: 'GROQ_API_KEY is not configured' },
        { status: 500 }
      );
    }

    const systemPrompt = documentPrompts[type as keyof typeof documentPrompts] || documentPrompts.document;

    const completion = await groq.chat.completions.create({
      messages: [
        {
          role: 'user',
          content: systemPrompt(prompt),
        },
      ],
      model: 'llama-3.1-70b-versatile',
      temperature: 0.7,
      max_tokens: 4000,
      top_p: 1,
      stream: false,
    });

    const generatedContent = completion.choices[0]?.message?.content;

    if (!generatedContent) {
      return NextResponse.json(
        { error: 'Failed to generate content' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      content: generatedContent,
      type,
      timestamp: new Date().toISOString(),
    });

  } catch (error) {
    console.error('Error generating document:', error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: `Generation failed: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}