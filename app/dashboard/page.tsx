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
      <div className="w-full min-h-screen bg-white p-6">
        <div className="grid grid-cols-4 animate-pulse gap-6">
          <div className="w-full h-64 bg-muted rounded"></div>
          <div className="w-full h-64 bg-muted rounded"></div>
          <div className="w-full h-64 bg-muted rounded"></div>
          <div className="w-full h-64 bg-muted rounded"></div>
          <div className="col-span-2 w-full h-80 bg-muted rounded"></div>
          <div className="col-span-2 w-full h-80 bg-muted rounded"></div>
          <div className="col-span-2 w-full h-80 bg-muted rounded"></div>
          <div className="col-span-2 w-full h-80 bg-muted rounded"></div>
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
      label: "AI Consultations",
      value: String(dashboardData?.summaryStats?.totalConsultations ?? 0),
      change: dashboardData?.summaryStats?.consultationsChange ?? "0",
      trend: (
        dashboardData?.summaryStats?.consultationsChange ?? ""
      ).startsWith("+")
        ? "up"
        : "down",
      icon: MessageSquare,
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

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-20 flex items-center w-full">
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
            return (
              <Card key={stat.label}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-slate-600">
                    {stat.label}
                  </CardTitle>
                  <Icon className="h-4 w-4 text-slate-400" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold mb-1">{stat.value}</div>
                  <div className="flex items-center text-xs">
                    {isPositive ? (
                      <ArrowUpRight className="h-3 w-3 text-green-500 mr-1" />
                    ) : (
                      <ArrowDownRight className="h-3 w-3 text-red-500 mr-1" />
                    )}
                    <span
                      className={isPositive ? "text-green-500" : "text-red-500"}
                    >
                      {stat.change}
                    </span>
                    <span className="text-slate-500 ml-1">from last month</span>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Monthly Trends Line Chart */}
          <Card>
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

          {/* Document Types Bar Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="h-5 w-5 mr-2" />
                Document Types Distribution
              </CardTitle>
              <CardDescription>
                Breakdown of your documents by type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={dashboardData.documentTypes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="type" />
                  <YAxis />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar
                    dataKey="count"
                    fill="var(--color-count)"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ChartContainer>
            </CardContent>
          </Card>
        </div>

        {/* Credit Usage Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Coins className="h-5 w-5 mr-2" />
              Credit Usage Overview
            </CardTitle>
            <CardDescription>
              Your current credit status and usage
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Current Balance</span>
                <span className="text-2xl font-bold text-green-600">
                  {dashboardData.userCredit.balance}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm font-medium">Daily Limit</span>
                <span className="text-lg font-semibold">
                  {dashboardData.userCredit.dailyLimit}
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full"
                  style={{
                    width: `${
                      (dashboardData.userCredit.balance /
                        dashboardData.userCredit.dailyLimit) *
                      100
                    }%`,
                  }}
                ></div>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>
                  Total Earned: {dashboardData.userCredit.totalEarned}
                </span>
                <span>Total Spent: {dashboardData.userCredit.totalSpent}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Activity className="h-5 w-5 mr-2" />
              Quick Actions
            </CardTitle>
            <CardDescription>Access your most used features</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link href="/dashboard/documents">
                <div className="group p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 rounded-lg bg-blue-500 text-white">
                      <FileText className="h-4 w-4" />
                    </div>
                    <h3 className="font-medium text-slate-900 group-hover:text-primary">
                      Manage Documents
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    Upload, organize, and analyze your business documents
                  </p>
                </div>
              </Link>

              <Link href="/dashboard/chat">
                <div className="group p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 rounded-lg bg-green-500 text-white">
                      <MessageSquare className="h-4 w-4" />
                    </div>
                    <h3 className="font-medium text-slate-900 group-hover:text-primary">
                      AI Consultation
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    Get AI-powered business insights and recommendations
                  </p>
                </div>
              </Link>

              <Link href="/dashboard/billing">
                <div className="group p-4 rounded-lg border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="p-2 rounded-lg bg-purple-500 text-white">
                      <BarChart3 className="h-4 w-4" />
                    </div>
                    <h3 className="font-medium text-slate-900 group-hover:text-primary">
                      Analytics & Billing
                    </h3>
                  </div>
                  <p className="text-sm text-slate-600">
                    View detailed analytics and manage your subscription
                  </p>
                </div>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
