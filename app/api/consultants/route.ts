import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    
    const search = searchParams.get('search') || '';
    const category = searchParams.get('category') || 'all';
    const minPrice = parseInt(searchParams.get('minPrice') || '0');
    const maxPrice = parseInt(searchParams.get('maxPrice') || '10000000');
    const sortBy = searchParams.get('sortBy') || 'rating';
    const consultationType = searchParams.get('consultationType') || 'all';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '12');

    // Build where clause
    const where: any = {
      status: 'approved',
      isVerified: true,
      hourlyRate: {
        gte: minPrice,
        lte: maxPrice
      }
    };

    // Add category filter
    if (category !== 'all') {
      where.categoryId = category;
    }

    // Add search filter
    if (search) {
      where.OR = [
        {
          fullName: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          title: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          bio: {
            contains: search,
            mode: 'insensitive'
          }
        },
        {
          specializations: {
            array_contains: search
          }
        }
      ];
    }

    // Add consultation type filter
    if (consultationType !== 'all') {
      where.consultationTypes = {
        array_contains: consultationType
      };
    }

    // Build order by clause
    let orderBy: any = {};
    switch (sortBy) {
      case 'rating':
        orderBy = { averageRating: 'desc' };
        break;
      case 'price_low':
        orderBy = { hourlyRate: 'asc' };
        break;
      case 'price_high':
        orderBy = { hourlyRate: 'desc' };
        break;
      case 'experience':
        orderBy = { experience: 'desc' };
        break;
      case 'reviews':
        orderBy = { totalReviews: 'desc' };
        break;
      default:
        orderBy = { averageRating: 'desc' };
    }

    const consultants = await prisma.consultant.findMany({
      where,
      include: {
        category: true,
        user: {
          select: {
            name: true,
            email: true,
            image: true
          }
        }
      },
      orderBy,
      skip: (page - 1) * limit,
      take: limit
    });

    // Get total count for pagination
    const totalCount = await prisma.consultant.count({ where });

    // Transform data to match frontend interface
    const transformedConsultants = consultants.map((consultant: any) => ({
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
      isVerified: consultant.isVerified
    }));

    return NextResponse.json({
      consultants: transformedConsultants,
      pagination: {
        page,
        limit,
        total: totalCount,
        totalPages: Math.ceil(totalCount / limit)
      }
    });
  } catch (error) {
    console.error('Error fetching consultants:', error);
    return NextResponse.json(
      { error: 'Failed to fetch consultants' },
      { status: 500 }
    );
  }
}