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

    const booking = await (prisma as any).consultantBooking.findUnique({
      where: {
        id: params.id,
      },
      include: {
        consultant: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
            category: true,
          },
        },
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if the booking belongs to the current user
    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user || booking.clientId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(booking);
  } catch (error) {
    console.error('Error fetching booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { status } = await request.json();

    // Validate status
    const validStatuses = ['pending_payment', 'confirmed', 'completed', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Check if booking exists and belongs to user
    const existingBooking = await (prisma as any).consultantBooking.findUnique({
      where: { id: params.id },
    });

    if (!existingBooking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (existingBooking.clientId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Additional validation for cancellation
    if (status === 'cancelled') {
      // Only allow cancellation if booking is not already completed or cancelled
      if (['completed', 'cancelled'].includes(existingBooking.status)) {
        return NextResponse.json(
          { error: 'Cannot cancel completed or already cancelled booking' },
          { status: 400 }
        );
      }

      // Check if booking is within cancellation window (e.g., at least 24 hours before)
      const scheduledTime = new Date(existingBooking.scheduledAt || existingBooking.sessionDate);
      const now = new Date();
      const hoursUntilBooking = (scheduledTime.getTime() - now.getTime()) / (1000 * 60 * 60);

      if (hoursUntilBooking < 24) {
        return NextResponse.json(
          { error: 'Cannot cancel booking less than 24 hours before scheduled time' },
          { status: 400 }
        );
      }
    }

    const updatedBooking = await (prisma as any).consultantBooking.update({
      where: { id: params.id },
      data: { 
        status,
        updatedAt: new Date(),
      },
      include: {
        consultant: {
          include: {
            user: {
              select: {
                name: true,
                email: true,
                image: true,
              },
            },
            category: true,
          },
        },
        payment: true,
      },
    });

    return NextResponse.json(updatedBooking);
  } catch (error) {
    console.error('Error updating booking:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}