import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { checkAndResetUserCredits } from '@/lib/credit-reset';

// GET /api/credits - Get user's credit balance
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userCredit: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Initialize user credit if it doesn't exist
    let userCredit = user.userCredit;
    if (!userCredit) {
      userCredit = await prisma.userCredit.create({
        data: {
          userId: user.id,
          balance: 500, // Default daily credits for free plan
          dailyLimit: 500,
          lastResetDate: new Date(),
        },
      });
    }

    // Check and perform daily reset if needed
    await checkAndResetUserCredits(user.id);

    // Fetch updated user credit after potential reset
    userCredit = await prisma.userCredit.findUnique({
      where: { userId: user.id },
    });

    if (!userCredit) {
      return NextResponse.json({ error: 'Credit data not found' }, { status: 404 });
    }

    return NextResponse.json({
      balance: userCredit.balance,
      dailyLimit: userCredit.dailyLimit,
      totalEarned: userCredit.totalEarned,
      totalSpent: userCredit.totalSpent,
      lastResetDate: userCredit.lastResetDate,
    });
  } catch (error) {
    console.error('Error fetching credit balance:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/credits - Consume credits
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userCredit: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { amount, description, reference } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Amount must be a positive number' },
        { status: 400 }
      );
    }

    // Initialize user credit if it doesn't exist
    let userCredit = user.userCredit;
    if (!userCredit) {
      userCredit = await prisma.userCredit.create({
        data: {
          userId: user.id,
          balance: 500, // Default daily credits for free plan
          dailyLimit: 500,
          lastResetDate: new Date(),
        },
      });
    }

    // Check if user has sufficient credits
    if (userCredit.balance < amount) {
      return NextResponse.json(
        { error: 'Insufficient credits' },
        { status: 400 }
      );
    }

    // Consume credits in a transaction
    const [updatedCredit] = await prisma.$transaction([
      prisma.userCredit.update({
        where: { userId: user.id },
        data: {
          balance: { decrement: amount },
          totalSpent: { increment: amount },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          type: 'spend',
          amount: -amount,
          description: description || 'Credit consumption',
          reference: reference,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      newBalance: updatedCredit.balance,
      consumed: amount,
    });
  } catch (error) {
    console.error('Error consuming credits:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}