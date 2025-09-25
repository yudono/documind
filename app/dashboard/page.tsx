"use client";

import { useSession } from "next-auth/react";
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

export default function Dashboard() {
  const { data: session } = useSession();

  // Summary statistics
  const summaryStats = [
    {
      label: "Total Documents",
      value: "1,247",
      change: "+12.5%",
      trend: "up",
      icon: FileText,
    },
    {
      label: "AI Consultations",
      value: "342",
      change: "+23.1%",
      trend: "up",
      icon: MessageSquare,
    },
    {
      label: "Revenue Growth",
      value: "18.7%",
      change: "+5.2%",
      trend: "up",
      icon: TrendingUp,
    },
    {
      label: "Active Users",
      value: "89",
      change: "+8.3%",
      trend: "up",
      icon: Activity,
    },
  ];

  // Monthly data for line chart
  const monthlyData = [
    { month: "Jan", documents: 65, consultations: 28, revenue: 12.5 },
    { month: "Feb", documents: 78, consultations: 35, revenue: 14.2 },
    { month: "Mar", documents: 92, consultations: 42, revenue: 15.8 },
    { month: "Apr", documents: 108, consultations: 48, revenue: 16.9 },
    { month: "May", documents: 125, consultations: 55, revenue: 17.5 },
    { month: "Jun", documents: 142, consultations: 62, revenue: 18.7 },
  ];

  // Document types data for bar chart
  const documentTypesData = [
    { type: "PDF", count: 456, percentage: 36.6 },
    { type: "DOCX", count: 342, percentage: 27.4 },
    { type: "XLSX", count: 289, percentage: 23.2 },
    { type: "TXT", count: 98, percentage: 7.9 },
    { type: "Others", count: 62, percentage: 4.9 },
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
    revenue: {
      label: "Revenue Growth %",
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
                Monthly Trends
              </CardTitle>
              <CardDescription>
                Documents, consultations, and revenue growth over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <LineChart data={monthlyData}>
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
                    dataKey="revenue"
                    stroke="var(--color-revenue)"
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
                Breakdown of documents by file type
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ChartContainer config={chartConfig} className="h-[300px]">
                <BarChart data={documentTypesData}>
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
