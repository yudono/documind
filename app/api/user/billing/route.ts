import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// GET /api/user/billing - Get user billing information
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        billing: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Create default billing record if it doesn't exist
    let billing = user.billing;
    if (!billing) {
      billing = await prisma.billing.create({
        data: {
          userId: user.id,
        },
      });
    }

    return NextResponse.json({ billing });
  } catch (error) {
    console.error('Error fetching user billing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT /api/user/billing - Update user billing information
export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const {
      plan,
      tokensUsed,
      tokensLimit,
      documentsUploaded,
      documentsLimit,
      billingCycle,
      lastBillingDate,
      nextBillingDate,
      stripeCustomerId,
      stripeSubscriptionId,
    } = await request.json();

    const updateData: any = {};

    if (plan !== undefined) {
      if (!['free', 'pro', 'enterprise'].includes(plan)) {
        return NextResponse.json(
          { error: 'Plan must be one of: free, pro, enterprise' },
          { status: 400 }
        );
      }
      updateData.plan = plan;
    }

    if (tokensUsed !== undefined) {
      if (typeof tokensUsed !== 'number' || tokensUsed < 0) {
        return NextResponse.json(
          { error: 'tokensUsed must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.tokensUsed = tokensUsed;
    }

    if (tokensLimit !== undefined) {
      if (typeof tokensLimit !== 'number' || tokensLimit < 0) {
        return NextResponse.json(
          { error: 'tokensLimit must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.tokensLimit = tokensLimit;
    }

    if (documentsUploaded !== undefined) {
      if (typeof documentsUploaded !== 'number' || documentsUploaded < 0) {
        return NextResponse.json(
          { error: 'documentsUploaded must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.documentsUploaded = documentsUploaded;
    }

    if (documentsLimit !== undefined) {
      if (typeof documentsLimit !== 'number' || documentsLimit < 0) {
        return NextResponse.json(
          { error: 'documentsLimit must be a non-negative number' },
          { status: 400 }
        );
      }
      updateData.documentsLimit = documentsLimit;
    }

    if (billingCycle !== undefined) {
      if (!['monthly', 'yearly'].includes(billingCycle)) {
        return NextResponse.json(
          { error: 'billingCycle must be either "monthly" or "yearly"' },
          { status: 400 }
        );
      }
      updateData.billingCycle = billingCycle;
    }

    if (lastBillingDate !== undefined) {
      updateData.lastBillingDate = lastBillingDate ? new Date(lastBillingDate) : null;
    }

    if (nextBillingDate !== undefined) {
      updateData.nextBillingDate = nextBillingDate ? new Date(nextBillingDate) : null;
    }

    if (stripeCustomerId !== undefined) {
      updateData.stripeCustomerId = stripeCustomerId;
    }

    if (stripeSubscriptionId !== undefined) {
      updateData.stripeSubscriptionId = stripeSubscriptionId;
    }

    const billing = await prisma.billing.upsert({
      where: { userId: user.id },
      update: updateData,
      create: {
        userId: user.id,
        ...updateData,
      },
    });

    return NextResponse.json({ billing });
  } catch (error) {
    console.error('Error updating user billing:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}