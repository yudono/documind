import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/credits/packages - Get available credit packages
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get all active credit packages
    const packages = await prisma.creditPackage.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        credits: 'asc',
      },
    });

    return NextResponse.json({
      packages: packages.map((pkg: any) => ({
        id: pkg.id,
        name: pkg.name,
        description: pkg.description,
        credits: pkg.credits,
        price: pkg.price,
        currency: pkg.currency,
        isPopular: pkg.isPopular,
        bonusCredits: pkg.bonusCredits,
        totalCredits: pkg.credits + (pkg.bonusCredits || 0),
      })),
    });

  } catch (error) {
    console.error('Error fetching credit packages:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/credits/packages - Create a new credit package (admin only)
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

    // Check if user is admin (you might want to add an isAdmin field to User model)
    // For now, we'll skip this check, but in production you should implement proper admin authorization

    const {
      name,
      description,
      credits,
      price,
      currency = 'USD',
      isPopular = false,
      bonusCredits = 0,
    } = await request.json();

    if (!name || !description || !credits || !price) {
      return NextResponse.json(
        { error: 'Name, description, credits, and price are required' },
        { status: 400 }
      );
    }

    const creditPackage = await prisma.creditPackage.create({
      data: {
        name,
        description,
        credits,
        price,
        currency,
        isPopular,
        bonusCredits,
        isActive: true,
      },
    });

    return NextResponse.json({
      success: true,
      package: creditPackage,
    });

  } catch (error) {
    console.error('Error creating credit package:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}