import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/admin-auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: NextRequest) {
  try {
    const { isAdmin, error } = await checkAdminAuth();
    
    if (!isAdmin) {
      return NextResponse.json({ error: error || 'Admin access required' }, { status: 403 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get total users with credit records
    const totalUsers = await prisma.userCredit.count();

    // Get users who have used credits today
    const activeUsersResult = await prisma.creditTransaction.findMany({
      where: {
        createdAt: { gte: today },
        type: 'consumption'
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    });
    const activeUsers = activeUsersResult.length;

    // Get total credits issued (all positive transactions)
    const creditsIssuedResult = await prisma.creditTransaction.aggregate({
      where: {
        amount: { gt: 0 }
      },
      _sum: {
        amount: true
      }
    });

    // Get total credits consumed (all negative transactions)
    const creditsConsumedResult = await prisma.creditTransaction.aggregate({
      where: {
        amount: { lt: 0 }
      },
      _sum: {
        amount: true
      }
    });

    // Get total revenue from purchases
    const revenueResult = await prisma.creditTransaction.aggregate({
      where: {
        type: 'purchase'
      },
      _sum: {
        amount: true
      }
    });

    // Get daily active users (users with any transaction today)
    const dailyActiveUsersResult = await prisma.creditTransaction.findMany({
      where: {
        createdAt: { gte: today }
      },
      select: {
        userId: true
      },
      distinct: ['userId']
    });
    const dailyActiveUsers = dailyActiveUsersResult.length;

    // Calculate total revenue (this is a simplified calculation)
    // In a real system, you'd track actual payment amounts separately
    const totalRevenue = Math.abs(revenueResult._sum.amount || 0) * 10; // Rough estimate

    const stats = {
      totalUsers,
      activeUsers,
      totalCreditsIssued: creditsIssuedResult._sum.amount || 0,
      totalCreditsConsumed: Math.abs(creditsConsumedResult._sum.amount || 0),
      totalRevenue,
      dailyActiveUsers
    };

    return NextResponse.json(stats);

  } catch (error: any) {
    console.error('Error fetching admin stats:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}