import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const consultantId = params.id;

    const consultant = await (prisma as any).consultant.findUnique({
      where: {
        id: consultantId,
        status: 'approved',
        isVerified: true
      },
      include: {
        category: true,
        user: {
          select: {
            name: true,
            email: true,
            image: true
          }
        }
      }
    });

    if (!consultant) {
      return NextResponse.json(
        { error: 'Consultant not found' },
        { status: 404 }
      );
    }

    // Transform data to match frontend interface
    const transformedConsultant = {
      id: consultant.id,
      fullName: consultant.fullName,
      title: consultant.title,
      bio: consultant.bio || '',
      profileImage: consultant.profileImage || consultant.user.image || '',
      experience: consultant.experience,
      hourlyRate: consultant.hourlyRate,
      currency: consultant.currency,
      averageRating: consultant.averageRating,
      totalReviews: consultant.totalReviews,
      responseTime: consultant.responseTime || 'Same day',
      consultationTypes: consultant.consultationTypes || [],
      specializations: consultant.specializations || [],
      category: consultant.category,
      isVerified: consultant.isVerified,
      education: consultant.education,
      certifications: consultant.certifications || [],
      languages: consultant.languages || [],
      totalBookings: consultant.totalBookings,
      completedBookings: consultant.completedBookings
    };

    return NextResponse.json(transformedConsultant);
  } catch (error) {
    console.error('Error fetching consultant:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultant' },
      { status: 500 }
    );
  }
}