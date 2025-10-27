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

    // Get document types distribution (category summary: xlsx, doc, ppt, pdf, image, csv, txt, other)
    const toCategory = (fileType?: string | null, name?: string) => {
      const ft = (fileType || "").toLowerCase();
      const ext = (name?.split(".").pop() || "").toLowerCase();

      // Excel
      if (
        ft.includes("vnd.openxmlformats-officedocument.spreadsheetml.sheet") ||
        ft.includes("vnd.ms-excel") ||
        ["xls", "xlsx"].includes(ext)
      )
        return "xlsx";

      // Word
      if (
        ft.includes("msword") ||
        ft.includes("vnd.openxmlformats-officedocument.wordprocessingml.document") ||
        ["doc", "docx"].includes(ext)
      )
        return "doc";

      // PowerPoint
      if (
        ft.includes("vnd.ms-powerpoint") ||
        ft.includes("vnd.openxmlformats-officedocument.presentationml.presentation") ||
        ["ppt", "pptx"].includes(ext)
      )
        return "ppt";

      // PDF
      if (ft.includes("application/pdf") || ext === "pdf") return "pdf";

      // CSV
      if (ft.includes("text/csv") || ft.includes("application/csv") || ext === "csv") return "csv";

      // Text
      if (ft.startsWith("text/") || ext === "txt") return "txt";

      // Image
      if (ft.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "bmp", "webp", "tif", "tiff", "svg"].includes(ext))
        return "image";

      return "other";
    };

    // Aggregate by fileType first for efficiency
    const fileTypeGroups = await prisma.item.groupBy({
      by: ["fileType"],
      where: {
        userId: user.id,
        type: "document",
      },
      _count: { fileType: true },
    });

    const categoryCounts: Record<string, number> = {};
    for (const g of fileTypeGroups) {
      const cat = toCategory(g.fileType);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + (g._count.fileType || 0);
    }

    // For items with null fileType, fall back to name extension categorization
    const unknownTypeItems = await prisma.item.findMany({
      where: { userId: user.id, type: "document", fileType: null },
      select: { name: true },
    });
    for (const it of unknownTypeItems) {
      const cat = toCategory(null, it.name || undefined);
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    }

    const documentTypes = Object.entries(categoryCounts)
      .map(([type, count]) => ({ type, count }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count);

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
      documentTypes,
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
