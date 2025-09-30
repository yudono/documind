import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/subscriptions - Get available subscription plans and user's current subscription
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

    // Get all active subscription plans
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        price: 'asc',
      },
    });

    // Get user's current subscription (if any)
    // For now, we'll assume free plan if no subscription exists
    const currentPlan = {
      id: 'free',
      name: 'Free Plan',
      description: 'Basic features with daily credit limit',
      price: 0,
      currency: 'USD',
      billingPeriod: 'monthly',
      creditsPerMonth: 500,
      features: ['500 daily credits', 'Basic chat functionality', 'Document upload'],
      isActive: true,
    };

    return NextResponse.json({
      plans: plans.map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        billingPeriod: plan.billingPeriod,
        creditsPerMonth: plan.creditsPerMonth,
        features: plan.features,
        isPopular: plan.isPopular,
      })),
      currentPlan,
      userCredit: user.userCredit ? {
        balance: user.userCredit.balance,
        dailyLimit: user.userCredit.dailyLimit,
        totalEarned: user.userCredit.totalEarned,
        totalSpent: user.userCredit.totalSpent,
      } : null,
    });

  } catch (error) {
    console.error('Error fetching subscriptions:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions - Subscribe to a plan
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

    const { planId, paymentMethod, transactionId } = await request.json();

    if (!planId || !paymentMethod || !transactionId) {
      return NextResponse.json(
        { error: 'Plan ID, payment method, and transaction ID are required' },
        { status: 400 }
      );
    }

    // Get the subscription plan details
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive subscription plan' },
        { status: 400 }
      );
    }

    // Initialize user credit if it doesn't exist
    let userCredit = user.userCredit;
    if (!userCredit) {
      userCredit = await prisma.userCredit.create({
        data: {
          userId: user.id,
          balance: 0,
          dailyLimit: plan.creditsPerMonth || 500,
          lastResetDate: new Date(),
        },
      });
    }

    // Update user's credit limit and add subscription credits
    const subscriptionEndDate = new Date();
    subscriptionEndDate.setMonth(subscriptionEndDate.getMonth() + 1); // Add 1 month

    await prisma.$transaction([
      prisma.userCredit.update({
        where: { userId: user.id },
        data: {
          balance: { increment: plan.creditsPerMonth || 0 },
          dailyLimit: plan.creditsPerMonth || 500,
          totalEarned: { increment: plan.creditsPerMonth || 0 },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          type: 'earn',
          amount: plan.creditsPerMonth || 0,
          description: `Subscription: ${plan.name}`,
          reference: transactionId,
          metadata: {
            planId: plan.id,
            planName: plan.name,
            paymentMethod,
            price: plan.price,
            billingPeriod: plan.billingPeriod,
            subscriptionEndDate: subscriptionEndDate.toISOString(),
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Successfully subscribed to ${plan.name}`,
      plan: {
        id: plan.id,
        name: plan.name,
        creditsPerMonth: plan.creditsPerMonth,
        subscriptionEndDate,
      },
      transaction: {
        transactionId,
        amount: plan.creditsPerMonth,
      },
    });

  } catch (error) {
    console.error('Error subscribing to plan:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}