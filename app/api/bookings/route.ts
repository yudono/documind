import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      consultantId,
      sessionDate,
      sessionDuration,
      sessionType,
      title,
      description,
      totalAmount
    } = body;

    // Validate required fields
    if (!consultantId || !sessionDate || !sessionType || !title || !totalAmount) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Gunakan ID user dari session
    const userId = (session.user as any).id;
    
    if (!userId) {
      return NextResponse.json(
        { error: 'User ID not found in session' },
        { status: 401 }
      );
    }

    // Verify consultant exists and is available
    const consultant = await (prisma as any).consultant.findUnique({
      where: {
        id: consultantId,
        status: 'approved',
        isVerified: true
      }
    });

    if (!consultant) {
      return NextResponse.json(
        { error: 'Consultant not found or not available' },
        { status: 404 }
      );
    }

    // Check for conflicting bookings
    const conflictingBooking = await (prisma as any).consultantBooking.findFirst({
      where: {
        consultantId,
        sessionDate: new Date(sessionDate),
        status: {
          in: ['pending', 'confirmed', 'in_progress']
        }
      }
    });

    if (conflictingBooking) {
      return NextResponse.json(
        { error: 'Time slot is already booked' },
        { status: 409 }
      );
    }

    // Create booking
    const booking = await (prisma as any).consultantBooking.create({
      data: {
        consultantId,
        clientId: userId,
        sessionDate: new Date(sessionDate),
        sessionDuration: sessionDuration || 60,
        sessionType,
        title,
        description: description || '',
        totalAmount,
        currency: consultant.currency,
        status: 'pending',
        paymentStatus: 'pending'
      },
      include: {
        consultant: {
          select: {
            fullName: true,
            title: true,
            profileImage: true
          }
        },
        client: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return NextResponse.json(booking, { status: 201 });
  } catch (error) {
    console.error('Error creating booking:', error);
    return NextResponse.json(
      { error: 'Failed to create booking' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');
    const status = searchParams.get('status') || 'all';

    // Get user from session
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });

    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Build where clause
    const where: any = {
      clientId: user.id
    };

    if (status !== 'all') {
      where.status = status;
    }

    const bookings = await (prisma as any).consultantBooking.findMany({
      where,
      include: {
        consultant: {
          select: {
            fullName: true,
            title: true,
            profileImage: true,
            category: {
              select: {
                name: true,
                color: true
              }
            }
          }
        }
      },
      orderBy: {
        sessionDate: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Get total count for pagination
    const totalCount = await (prisma as any).consultantBooking.count({ where });

    return NextResponse.json({
      bookings,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    return NextResponse.json(
      { error: 'Failed to fetch bookings' },
      { status: 500 }
    );
  }
}