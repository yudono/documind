import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { isAdmin, error } = await checkAdminAuth();
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '20');
    const search = searchParams.get('search') || '';

    const skip = (page - 1) * limit;

    // Build where clause for search
    const whereClause = search ? {
      user: {
        OR: [
          { email: { contains: search, mode: 'insensitive' as const } },
          { name: { contains: search, mode: 'insensitive' as const } }
        ]
      }
    } : {};

    // Get users with their credit information
    const users = await prisma.userCredit.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            createdAt: true
          }
        }
      },
      orderBy: {
        totalSpent: 'desc' // Order by most active users first
      },
      skip,
      take: limit
    });

    // Get total count for pagination
    const totalCount = await prisma.userCredit.count({
      where: whereClause
    });

    const totalPages = Math.ceil(totalCount / limit);

    return NextResponse.json({
      users,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1
      }
    });

  } catch (error: any) {
    console.error('Error fetching admin users:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// PATCH endpoint to update user credits (admin only)
export async function PATCH(request: NextRequest) {
  try {
    const { isAdmin, error } = await checkAdminAuth();
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
    }

    const body = await request.json();
    const { userId, balance, dailyLimit, action } = body;

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    let updateData: any = {};
    let transactionData: any = null;

    switch (action) {
      case 'set_balance': {
        if (typeof balance !== 'number') {
          return NextResponse.json({ error: 'Balance must be a number' }, { status: 400 });
        }

        const currentCredit = await prisma.userCredit.findUnique({
          where: { userId }
        });

        if (!currentCredit) {
          return NextResponse.json({ error: 'User credit record not found' }, { status: 404 });
        }

        const currentBalance = Math.max(0, (currentCredit.dailyLimit || 0) - (currentCredit.dailyUsed || 0));
        const difference = balance - currentBalance;

        // Adjust dailyUsed so that derived balance equals requested balance
        const newDailyUsed = Math.max(0, (currentCredit.dailyLimit || 0) - balance);
        updateData = {
          dailyUsed: newDailyUsed,
        };

        transactionData = {
          userId,
          type: 'admin_adjustment',
          amount: difference,
          description: `Admin balance adjustment: ${difference > 0 ? '+' : ''}${difference} credits (set balance to ${balance})`,
          reference: `admin-${Date.now()}`
        };
        break;
      }

      case 'set_daily_limit':
        if (typeof dailyLimit !== 'number') {
          return NextResponse.json({ error: 'Daily limit must be a number' }, { status: 400 });
        }
        updateData = { dailyLimit };
        break;

      case 'reset_daily':
        updateData = {
          dailyUsed: 0,
          lastResetDate: new Date()
        };

        transactionData = {
          userId,
          type: 'admin_reset',
          amount: 0,
          description: 'Admin daily usage reset',
          reference: `admin-reset-${Date.now()}`
        };
        break;

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    // Update user credit
    const updatedCredit = await prisma.userCredit.update({
      where: { userId },
      data: updateData,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true
          }
        }
      }
    });

    // Create transaction record if needed
    if (transactionData) {
      await prisma.creditTransaction.create({
        data: transactionData
      });
    }

    return NextResponse.json({
      success: true,
      userCredit: updatedCredit
    });

  } catch (error: any) {
    console.error('Error updating user credits:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}