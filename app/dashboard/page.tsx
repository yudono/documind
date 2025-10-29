"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from "@/components/ui/chart";
import Link from "next/link";
import {
  FileText,
  MessageSquare,
  TrendingUp,
  BarChart3,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  CreditCard,
  Coins,
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";

interface DashboardStats {
  summaryStats: {
    totalDocuments: number;
    documentsChange: string;
    totalConsultations: number;
    consultationsChange: string;
    creditBalance: number;
    creditUsage: string;
    totalSpent: number;
  };
  monthlyData: Array<{
    month: string;
    documents: number;
    consultations: number;
    creditsSpent: number;
  }>;
  documentTypes: Array<{
    type: string;
    count: number;
  }>;
  userCredit: {
    balance: number;
    dailyLimit: number;
    totalEarned: number;
    totalSpent: number;
    lastResetDate: string;
  };
}

export default function Dashboard() {
  const { data: session } = useSession();
  const [dashboardData, setDashboardData] = useState<DashboardStats | null>(
    null
  );
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const response = await fetch("/api/dashboard/stats");
        if (response.ok) {
          const data = await response.json();
          setDashboardData(data);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      } finally {
        setLoading(false);
      }
    };

    if (session) {
      fetchDashboardData();
    }
  }, [session]);

  if (loading) {
    return (
      <div className="relative min-h-screen overflow-hidden">
        {/* Overlay gradien mengikuti gaya landing */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />

        <div className="w-full min-h-screen bg-white p-6">
          <div className="grid grid-cols-4 animate-pulse gap-6">
            <Card className="animate-pulse bg-white">
              <CardContent className="pt-6 space-y-4">
                <div className="w-48 h-4 bg-muted rounded"></div>
                <div className="w-24 h-10 bg-muted rounded"></div>
                <div className="w-32 h-4 bg-muted rounded"></div>
              </CardContent>
            </Card>
            <Card className="animate-pulse bg-white">
              <CardContent className="pt-6 space-y-4">
                <div className="w-48 h-4 bg-muted rounded"></div>
                <div className="w-24 h-10 bg-muted rounded"></div>
                <div className="w-32 h-4 bg-muted rounded"></div>
              </CardContent>
            </Card>
            <Card className="animate-pulse bg-white">
              <CardContent className="pt-6 space-y-4">
                <div className="w-48 h-4 bg-muted rounded"></div>
                <div className="w-24 h-10 bg-muted rounded"></div>
                <div className="w-32 h-4 bg-muted rounded"></div>
              </CardContent>
            </Card>
            <Card className="animate-pulse bg-white">
              <CardContent className="pt-6 space-y-4">
                <div className="w-48 h-4 bg-muted rounded"></div>
                <div className="w-24 h-10 bg-muted rounded"></div>
                <div className="w-32 h-4 bg-muted rounded"></div>
              </CardContent>
            </Card>
            <Card className="col-span-2 animate-pulse bg-white">
              <CardContent className="pt-6 space-y-4">
                <div className="w-64 h-10 bg-muted rounded"></div>
                <div className="w-full h-80 bg-muted rounded"></div>
              </CardContent>
            </Card>
            <Card className="col-span-2 animate-pulse bg-white">
              <CardContent className="pt-6 space-y-4">
                <div className="w-64 h-10 bg-muted rounded"></div>
                <div className="w-full h-80 bg-muted rounded"></div>
              </CardContent>
            </Card>
            <Card className="col-span-2 animate-pulse bg-white">
              <CardContent className="pt-6 space-y-4">
                <div className="w-64 h-10 bg-muted rounded"></div>
                <div className="w-full h-80 bg-muted rounded"></div>
              </CardContent>
            </Card>
            <Card className="col-span-2 animate-pulse bg-white">
              <CardContent className="pt-6 space-y-4">
                <div className="w-64 h-10 bg-muted rounded"></div>
                <div className="w-full h-80 bg-muted rounded"></div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">Failed to load dashboard data</p>
        </div>
      </div>
    );
  }

  // Summary statistics with real data
  const summaryStats = [
    {
      label: "Total Documents",
      value: String(dashboardData?.summaryStats?.totalDocuments ?? 0),
      change: dashboardData?.summaryStats?.documentsChange ?? "0",
      trend: (dashboardData?.summaryStats?.documentsChange ?? "").startsWith(
        "+"
      )
        ? "up"
        : "down",
      icon: FileText,
    },
    {
      label: "Credit Balance",
      value: String(dashboardData?.summaryStats?.creditBalance ?? 0),
      change: `${dashboardData?.summaryStats?.creditUsage ?? "0"} used`,
      trend: "neutral",
      icon: Coins,
    },
    {
      label: "Credits Spent",
      value: String(dashboardData?.summaryStats?.totalSpent ?? 0),
      change: "Total usage",
      trend: "neutral",
      icon: CreditCard,
    },
    {
      label: "Daily Limit",
      value: String(dashboardData?.userCredit?.dailyLimit ?? 0),
      change: `${dashboardData?.userCredit?.balance ?? 0} remaining`,
      trend: "neutral",
      icon: Activity,
    },
  ];

  const chartConfig = {
    documents: {
      label: "Documents",
      color: "hsl(var(--chart-1))",
    },
    consultations: {
      label: "Consultations",
      color: "hsl(var(--chart-2))",
    },
    creditsSpent: {
      label: "Credits Spent",
      color: "hsl(var(--chart-3))",
    },
    count: {
      label: "Count",
      color: "hsl(var(--chart-1))",
    },
  };

  const PIE_COLORS = [
    "hsl(var(--chart-1))",
    "hsl(var(--chart-2))",
    "hsl(var(--chart-3))",
    "hsl(var(--chart-4))",
    "hsl(var(--chart-5))",
    "hsl(var(--chart-6))",
  ];

  return (
    <div className="relative min-h-screen overflow-hidden">
      {/* Overlay gradien mengikuti gaya landing */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-secondary/5" />
      <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl" />
      <div className="absolute bottom-20 right-10 w-96 h-96 bg-secondary/20 rounded-full blur-3xl" />

      <div className="relative z-10">
        {/* Header */}
        <div className="glass border-b p-4 h-20 flex items-center w-full">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center space-x-3">
              <div>
                <h1 className="font-semibold">Dashboard Analytics</h1>
                <p className="text-sm text-muted-foreground">
                  Welcome back, {session?.user?.name?.split(" ")[0]}!
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="p-8 space-y-8">
          {/* Summary Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {summaryStats.map((stat) => {
              const Icon = stat.icon;
              const isPositive = stat.trend === "up";
              const isNeutral = stat.trend === "neutral";
              return (
                <Card
                  key={stat.label}
                  className="glass hover:shadow-lg transition-all"
                >
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium text-slate-600">
                      {stat.label}
                    </CardTitle>
                    <Icon className="h-4 w-4 text-slate-400" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold mb-1">{stat.value}</div>
                    <div className="flex items-center text-xs">
                      {!isNeutral &&
                        (isPositive ? (
                          <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                        ))}
                      <span
                        className={
                          isNeutral
                            ? "text-slate-500"
                            : isPositive
                            ? "text-green-500"
                            : "text-red-500"
                        }
                      >
                        {stat.change}
                      </span>
                      {!isNeutral && (
                        <span className="text-slate-500 ml-1">
                          from last month
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Monthly Trends Line Chart */}
            <Card className="glass hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Monthly Activity
                </CardTitle>
                <CardDescription>
                  Documents created, consultations, and credits spent over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <LineChart data={dashboardData.monthlyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <ChartLegend content={<ChartLegendContent />} />
                    <Line
                      type="monotone"
                      dataKey="documents"
                      stroke="var(--color-documents)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="consultations"
                      stroke="var(--color-consultations)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="creditsSpent"
                      stroke="var(--color-creditsSpent)"
                      strokeWidth={2}
                      dot={{ r: 4 }}
                    />
                  </LineChart>
                </ChartContainer>
              </CardContent>
            </Card>

            {/* Document Types Pie Chart */}
            <Card className="glass hover:shadow-lg transition-all">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Document Type Summary
                </CardTitle>
                <CardDescription>
                  Breakdown of your documents by category (xlsx, doc, image,
                  etc)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={chartConfig} className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <ChartTooltip content={<ChartTooltipContent />} />
                      <Pie
                        data={dashboardData.documentTypes}
                        dataKey="count"
                        nameKey="type"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label
                      >
                        {dashboardData.documentTypes.map(
                          (entry: any, index: number) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={PIE_COLORS[index % PIE_COLORS.length]}
                            />
                          )
                        )}
                      </Pie>
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                </ChartContainer>
              </CardContent>
            </Card>
          </div>

          {/* Credit Usage Card removed: summary moved to top summary cards */}
        </div>
      </div>
    </div>
  );
}
