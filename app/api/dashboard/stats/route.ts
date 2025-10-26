import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getCache, setCache } from "@/lib/cache";

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

    // Try cache first
    const cacheKey = `dashboard:stats:${user.id}`;
    const cached = await getCache(cacheKey);
    if (cached) {
      return NextResponse.json(cached);
    }

    // Get document statistics
    const totalDocuments = await prisma.item.count({
      where: {
        userId: user.id,
        type: "document",
      },
    });

    const documentsThisMonth = await prisma.item.count({
      where: {
        userId: user.id,
        type: "document",
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    const documentsLastMonth = await prisma.item.count({
      where: {
        userId: user.id,
        type: "document",
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    // Get chat/consultation statistics
    const totalConsultations = await prisma.creditTransaction.count({
      where: {
        userId: user.id,
        description: {
          contains: "chat",
        },
      },
    });

    const consultationsThisMonth = await prisma.creditTransaction.count({
      where: {
        userId: user.id,
        description: {
          contains: "chat",
        },
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    const consultationsLastMonth = await prisma.creditTransaction.count({
      where: {
        userId: user.id,
        description: {
          contains: "chat",
        },
        createdAt: {
          gte: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1),
          lt: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
        },
      },
    });

    // Get credit information
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

    // Derive balance and totalSpent from schema-compatible fields/transactions
    const totalSpentAgg = await prisma.creditTransaction.aggregate({
      where: { userId: user.id, type: "spend" },
      _sum: { amount: true },
    });
    const totalSpent = Math.abs(totalSpentAgg._sum.amount || 0);
    const totalEarned = userCredit.totalEarned || 0;
    const balance = Math.max(0, totalEarned - totalSpent);

    // Get monthly activity data for charts
    const monthlyData = [] as any[];
    for (let i = 5; i >= 0; i--) {
      const monthStart = new Date(
        new Date().getFullYear(),
        new Date().getMonth() - i,
        1
      );
      const monthEnd = new Date(
        new Date().getFullYear(),
        new Date().getMonth() - i + 1,
        1
      );

      const monthName = monthStart.toLocaleDateString("en-US", {
        month: "short",
      });

      const documentsCount = await prisma.item.count({
        where: {
          userId: user.id,
          type: "document",
          createdAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      });

      const consultationsCount = await prisma.creditTransaction.count({
        where: {
          userId: user.id,
          description: {
            contains: "chat",
          },
          createdAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
      });

      const creditsSpent = await prisma.creditTransaction.aggregate({
        where: {
          userId: user.id,
          amount: { lt: 0 },
          createdAt: {
            gte: monthStart,
            lt: monthEnd,
          },
        },
        _sum: {
          amount: true,
        },
      });

      monthlyData.push({
        month: monthName,
        documents: documentsCount,
        consultations: consultationsCount,
        creditsSpent: Math.abs(creditsSpent._sum.amount || 0),
      });
    }

    // Get document types distribution
    const documentTypes = await prisma.item.groupBy({
      by: ["type"],
      where: {
        userId: user.id,
        type: "document",
      },
      _count: {
        type: true,
      },
    });

    // Calculate percentage changes
    const documentsChange =
      documentsLastMonth > 0
        ? (
            ((documentsThisMonth - documentsLastMonth) / documentsLastMonth) *
            100
          ).toFixed(1)
        : documentsThisMonth > 0
        ? "100.0"
        : "0.0";

    const consultationsChange =
      consultationsLastMonth > 0
        ? (
            ((consultationsThisMonth - consultationsLastMonth) /
              consultationsLastMonth) *
            100
          ).toFixed(1)
        : consultationsThisMonth > 0
        ? "100.0"
        : "0.0";

    const creditUsagePercentage =
      userCredit.dailyLimit > 0
        ? (((userCredit.dailyLimit - balance) / userCredit.dailyLimit) * 100).toFixed(1)
        : "0.0";

    const payload = {
      summaryStats: {
        totalDocuments,
        documentsChange: `${+documentsChange >= 0 ? "+" : ""}${documentsChange}%`,
        totalConsultations,
        consultationsChange: `${+consultationsChange >= 0 ? "+" : ""}${consultationsChange}%`,
        creditBalance: balance,
        creditUsage: `${creditUsagePercentage}%`,
        totalSpent: totalSpent,
      },
      monthlyData,
      documentTypes: documentTypes.map((dt) => ({
        type: dt.type,
        count: dt._count.type,
      })),
      userCredit: {
        balance: balance,
        dailyLimit: userCredit.dailyLimit,
        totalEarned: userCredit.totalEarned || 0,
        totalSpent: totalSpent,
        lastResetDate: userCredit.lastResetDate,
      },
    };

    // Cache result
    await setCache(cacheKey, payload);

    return NextResponse.json(payload);
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
