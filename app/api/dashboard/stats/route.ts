import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

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
          balance: 500,
          dailyLimit: 500,
          lastResetDate: new Date(),
        },
      });
    }

    // Get monthly activity data for charts
    const monthlyData = [];
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
        ? (
            ((userCredit.dailyLimit - userCredit.balance) /
              userCredit.dailyLimit) *
            100
          ).toFixed(1)
        : "0.0";

    return NextResponse.json({
      summaryStats: {
        totalDocuments,
        documentsChange: `${
          +documentsChange >= 0 ? "+" : ""
        }${documentsChange}%`,
        totalConsultations,
        consultationsChange: `${
          +consultationsChange >= 0 ? "+" : ""
        }${consultationsChange}%`,
        creditBalance: userCredit.balance,
        creditUsage: `${creditUsagePercentage}%`,
        totalSpent: userCredit.totalSpent || 0,
      },
      monthlyData,
      documentTypes: documentTypes.map((dt) => ({
        type: dt.type,
        count: dt._count.type,
      })),
      userCredit: {
        balance: userCredit.balance,
        dailyLimit: userCredit.dailyLimit,
        totalEarned: userCredit.totalEarned || 0,
        totalSpent: userCredit.totalSpent || 0,
        lastResetDate: userCredit.lastResetDate,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
