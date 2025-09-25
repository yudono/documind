import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user from database to get the ID
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      select: { id: true },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const template = await prisma.template.findUnique({
      where: { id: params.id },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    // Check if template is public or user owns it
    if (!template.isPublic && template.userId !== user.id) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }

    // Increment download count
    await prisma.template.update({
      where: { id: params.id },
      data: {
        downloadCount: {
          increment: 1,
        },
      },
    });

    // For now, return a mock download URL since we don't have actual files
    // In a real implementation, you would generate a signed URL for the file
    const downloadUrl = `https://example.com/templates/${template.id}.${template.type}`;

    return NextResponse.json({
      success: true,
      downloadUrl,
      template: {
        id: template.id,
        name: template.name,
        type: template.type,
        size: template.size,
      },
    });
  } catch (error) {
    console.error('Error downloading template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}