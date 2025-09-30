import { NextRequest, NextResponse } from 'next/server';
import { resetDailyCredits, addDailyCreditsForSubscribers } from '@/lib/credit-reset';

export async function POST(request: NextRequest) {
  try {
    // In production, you'd want to secure this endpoint
    // For example, check for an API key or run it as a cron job
    const { searchParams } = new URL(request.url);
    const apiKey = searchParams.get('key');
    
    // Simple API key check (in production, use environment variables)
    if (apiKey !== process.env.CRON_API_KEY && process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Reset daily usage for all users
    const resetResult = await resetDailyCredits();
    
    // Add daily credits for subscribers
    const bonusResult = await addDailyCreditsForSubscribers();

    return NextResponse.json({
      success: true,
      resetResult,
      bonusResult,
      timestamp: new Date().toISOString()
    });

  } catch (error: any) {
    console.error('Error in credit reset endpoint:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to check reset status
export async function GET() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Get some stats about today's resets
    const { prisma } = await import('@/lib/prisma');
    
    const resetTransactions = await prisma.creditTransaction.findMany({
      where: {
        type: 'reset',
        createdAt: { gte: today }
      }
    });

    const bonusTransactions = await prisma.creditTransaction.findMany({
      where: {
        type: 'daily_bonus',
        createdAt: { gte: today }
      }
    });

    return NextResponse.json({
      success: true,
      today: today.toISOString(),
      resetCount: resetTransactions.length,
      bonusCreditsGiven: bonusTransactions.reduce((sum: number, t: any) => sum + t.amount, 0),
      lastResetTime: resetTransactions[0]?.createdAt || null,
      lastBonusTime: bonusTransactions[0]?.createdAt || null
    });

  } catch (error: any) {
    console.error('Error checking reset status:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}