import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { checkAndResetUserCredits } from "@/lib/credit-reset";

// GET /api/credits - Get user's credit balance
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

    // Initialize user credit if it doesn't exist
    let userCredit = user.userCredit;
    if (!userCredit) {
      userCredit = await prisma.userCredit.create({
        data: {
          userId: user.id,
          dailyLimit: 500,
          dailyUsed: 0,
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
      return NextResponse.json(
        { error: "Credit data not found" },
        { status: 404 }
      );
    }

    // Compute derived values based on the new schema
    const balance = Math.max(
      0,
      (userCredit.dailyLimit || 0) - (userCredit.dailyUsed || 0)
    );

    // Compute totalSpent from transactions to retain response compatibility
    const totalSpentAgg = await prisma.creditTransaction.aggregate({
      where: { userId: user.id, type: "spend" },
      _sum: { amount: true },
    });
    const totalSpent = Math.abs(totalSpentAgg._sum.amount || 0);

    return NextResponse.json({
      balance,
      dailyLimit: userCredit.dailyLimit,
      totalEarned: userCredit.totalEarned,
      totalSpent,
      lastResetDate: userCredit.lastResetDate,
    });
  } catch (error) {
    console.error("Error fetching credit balance:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/credits - Consume credits
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

    const { amount, description, reference } = await request.json();

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: "Amount must be a positive number" },
        { status: 400 }
      );
    }

    // Initialize user credit if it doesn't exist
    let userCredit = user.userCredit;
    if (!userCredit) {
      userCredit = await prisma.userCredit.create({
        data: {
          userId: user.id,
          dailyLimit: 500,
          dailyUsed: 0,
          lastResetDate: new Date(),
        },
      });
    }

    // Check if user has sufficient available credits for today
    const available = Math.max(
      0,
      (userCredit.dailyLimit || 0) - (userCredit.dailyUsed || 0)
    );
    if (available < amount) {
      return NextResponse.json(
        { error: "Insufficient credits" },
        { status: 400 }
      );
    }

    // Consume credits in a transaction: increment dailyUsed
    const [updatedCredit] = await prisma.$transaction([
      prisma.userCredit.update({
        where: { userId: user.id },
        data: {
          dailyUsed: { increment: amount },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          type: "spend",
          amount: -amount,
          description: description || "Credit consumption",
          reference: reference,
        },
      }),
    ]);

    const newBalance = Math.max(
      0,
      (updatedCredit.dailyLimit || 0) - (updatedCredit.dailyUsed || 0)
    );

    return NextResponse.json({
      success: true,
      newBalance,
      consumed: amount,
    });
  } catch (error) {
    console.error("Error consuming credits:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
