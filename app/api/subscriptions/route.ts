import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/subscriptions - Get available subscription plans and user's current subscription
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userCredit: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all active subscription plans
    const plans = await prisma.subscriptionPlan.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        price: "asc",
      },
    });

    // Get user's current subscription (if any)
    // For now, we'll assume free plan if no subscription exists
    const currentPlan = {
      id: "free",
      name: "Free Plan",
      description: "Basic features with daily credit limit",
      price: 0,
      currency: "USD",
      billingPeriod: "monthly",
      creditsPerMonth: 500,
      features: [
        "500 daily credits",
        "Basic chat functionality",
        "Document upload",
      ],
      isActive: true,
    };

    return NextResponse.json({
      plans: plans.map((plan: any) => ({
        id: plan.id,
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        billingPeriod: "monthly", // Default billing period
        creditsPerMonth: plan.monthlyCredits, // Use monthlyCredits from schema
        features: plan.features,
        isPopular: false, // Default value since isPopular doesn't exist in SubscriptionPlan
      })),
      currentPlan,
      userCredit: user.userCredit
        ? {
            balance: Math.max(
              0,
              (user.userCredit.dailyLimit || 0) -
                (user.userCredit.dailyUsed || 0)
            ),
            dailyLimit: user.userCredit.dailyLimit,
            totalEarned: user.userCredit.totalEarned,
            // Compute totalSpent from transactions
            totalSpent: (
              await prisma.creditTransaction.aggregate({
                where: { userId: user.id, type: "spend" },
                _sum: { amount: true },
              })
            )._sum.amount
              ? Math.abs(
                  (
                    await prisma.creditTransaction.aggregate({
                      where: { userId: user.id, type: "spend" },
                      _sum: { amount: true },
                    })
                  )._sum.amount as number
                )
              : 0,
          }
        : null,
    });
  } catch (error) {
    console.error("Error fetching subscriptions:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/subscriptions - Subscribe to a plan
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userCredit: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { planId, paymentMethod, transactionId } = await request.json();

    if (!planId || !paymentMethod || !transactionId) {
      return NextResponse.json(
        { error: "Plan ID, payment method, and transaction ID are required" },
        { status: 400 }
      );
    }

    // Get the subscription plan details
    const plan = await prisma.subscriptionPlan.findUnique({
      where: { id: planId },
    });

    if (!plan || !plan.isActive) {
      return NextResponse.json(
        { error: "Invalid or inactive subscription plan" },
        { status: 400 }
      );
    }

    // Initialize user credit if it doesn't exist
    let userCredit = user.userCredit;
    if (!userCredit) {
      userCredit = await prisma.userCredit.create({
        data: {
          userId: user.id,
          dailyLimit: plan.dailyCredits || 500,
          dailyUsed: 0,
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
          // Set daily limit based on plan's dailyCredits
          dailyLimit: plan.dailyCredits || 500,
          // Award monthly credits to totalEarned
          totalEarned: { increment: plan.monthlyCredits || 0 },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          type: "earn",
          amount: plan.monthlyCredits || 0,
          description: `Subscription: ${plan.name}`,
          reference: transactionId,
          metadata: {
            planId: plan.id,
            planName: plan.name,
            paymentMethod,
            price: plan.price,
            billingPeriod: "monthly",
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
        creditsPerMonth: plan.monthlyCredits,
        subscriptionEndDate,
      },
      transaction: {
        transactionId,
        amount: plan.monthlyCredits,
      },
    });
  } catch (error) {
    console.error("Error subscribing to plan:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
