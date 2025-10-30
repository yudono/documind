import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const consultantId = params.id;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '10');

    const reviews = await (prisma as any).consultantReview.findMany({
      where: {
        consultantId,
        isPublic: true
      },
      include: {
        client: {
          select: {
            name: true,
            image: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      skip: (page - 1) * limit,
      take: limit
    });

    // Transform data to match frontend interface
    const transformedReviews = reviews.map((review: any) => ({
      id: review.id,
      rating: review.rating,
      comment: review.comment || '',
      client: {
        name: review.client.name || 'Anonymous',
        image: review.client.image
      },
      createdAt: review.createdAt.toISOString()
    }));

    // Get total count for pagination
    const totalCount = await (prisma as any).consultantReview.count({
      where: {
        consultantId,
        isPublic: true
      }
    });

    return NextResponse.json({
      reviews: transformedReviews,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching reviews:', error);
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { bookingId, rating, comment } = await request.json();

    // Validate input
    if (!bookingId || !rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Invalid input. Rating must be between 1 and 5.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Verify the booking exists, belongs to the user, is completed, and is for this consultant
    const booking = await (prisma as any).consultantBooking.findUnique({
      where: { id: bookingId },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    if (booking.clientId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    if (booking.consultantId !== params.id) {
      return NextResponse.json(
        { error: 'Booking does not belong to this consultant' },
        { status: 400 }
      );
    }

    if (booking.status !== 'completed') {
      return NextResponse.json(
        { error: 'Can only review completed bookings' },
        { status: 400 }
      );
    }

    // Check if review already exists
    const existingReview = await (prisma as any).consultantReview.findUnique({
      where: {
        bookingId: bookingId,
      },
    });

    if (existingReview) {
      return NextResponse.json(
        { error: 'Review already exists for this booking' },
        { status: 400 }
      );
    }

    // Create the review
    const review = await (prisma as any).consultantReview.create({
      data: {
        consultantId: params.id,
        clientId: user.id,
        bookingId: bookingId,
        rating: rating,
        comment: comment || '',
      },
      include: {
        client: {
          select: {
            name: true,
            image: true,
          },
        },
      },
    });

    // Update consultant's average rating
    const allReviews = await (prisma as any).consultantReview.findMany({
      where: { consultantId: params.id },
      select: { rating: true },
    });

    const averageRating = allReviews.reduce((sum: number, review: any) => sum + review.rating, 0) / allReviews.length;
    const totalReviews = allReviews.length;

    await (prisma as any).consultant.update({
      where: { id: params.id },
      data: {
        averageRating: parseFloat(averageRating.toFixed(1)),
        totalReviews: totalReviews,
      },
    });

    return NextResponse.json(review, { status: 201 });
  } catch (error) {
    console.error('Error creating review:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}