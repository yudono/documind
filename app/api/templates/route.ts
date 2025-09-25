import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/templates - Get all templates or user's templates
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const category = searchParams.get('category');
    const type = searchParams.get('type');
    const myTemplates = searchParams.get('my') === 'true';

    const whereClause: any = {};

    if (myTemplates) {
      whereClause.userId = user.id;
    } else {
      whereClause.isPublic = true;
    }

    if (category) {
      whereClause.category = category;
    }

    if (type) {
      whereClause.type = type;
    }

    const templates = await prisma.template.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json({ templates });
  } catch (error) {
    console.error('Error fetching templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/templates - Create a new template
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      name,
      description,
      type,
      category,
      url,
      key,
      bucket,
      size,
      thumbnail,
      isPublic = true,
    } = body;

    if (!name || !type) {
      return NextResponse.json(
        { error: 'Name and type are required' },
        { status: 400 }
      );
    }

    const template = await prisma.template.create({
      data: {
        name,
        description,
        type,
        category,
        url,
        key,
        bucket,
        size,
        thumbnail,
        isPublic,
        userId: user.id,
      },
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

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error('Error creating template:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE /api/templates - Delete multiple templates
export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const { templateIds } = body;

    if (!templateIds || !Array.isArray(templateIds)) {
      return NextResponse.json(
        { error: 'Template IDs array is required' },
        { status: 400 }
      );
    }

    // Only allow deletion of user's own templates
    const deletedTemplates = await prisma.template.deleteMany({
      where: {
        id: { in: templateIds },
        userId: user.id,
      },
    });

    return NextResponse.json({
      message: `${deletedTemplates.count} template(s) deleted successfully`,
      deletedCount: deletedTemplates.count,
    });
  } catch (error) {
    console.error('Error deleting templates:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}