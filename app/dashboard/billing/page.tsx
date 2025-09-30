"use client";

import { useState } from "react";
import { useUserCredit } from "@/hooks/useUserCredit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  CreditCard,
  Download,
  Calendar,
  TrendingUp,
  FileText,
  MessageSquare,
  Zap,
  AlertCircle,
  CheckCircle,
  Clock,
  DollarSign,
  BarChart3,
  Users,
  Crown,
  Star,
  Plus,
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
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface CreditUsage {
  category: string;
  used: number;
  icon: React.ReactNode;
}

interface CreditTransaction {
  id: string;
  date: Date;
  amount: number;
  type: "purchase" | "usage" | "refund";
  description: string;
  credits: number;
}

interface Plan {
  name: string;
  price: number;
  period: string;
  features: string[];
  credits: number;
  popular?: boolean;
}

export default function BillingPage() {
  const [currentPlan] = useState("Pro");
  const { userCredit, loading, error } = useUserCredit();
  
  // Use real credit data or fallback to defaults
  const currentCredits = userCredit?.balance || 0;
  const dailyCredits = userCredit?.dailyLimit || 500;

  // Mock credit usage data
  const creditUsage: CreditUsage[] = [
    {
      category: "Chat Messages",
      used: 1253,
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      category: "Document Processing",
      used: 847,
      icon: <FileText className="h-4 w-4" />,
    },
    {
      category: "AI Analysis",
      used: 653,
      icon: <Zap className="h-4 w-4" />,
    },
  ];

  // Mock usage analytics data for charts
  const usageAnalytics = [
    { date: "Jan", chatMessages: 120, documentProcessing: 80, aiAnalysis: 60 },
    { date: "Feb", chatMessages: 150, documentProcessing: 95, aiAnalysis: 75 },
    { date: "Mar", chatMessages: 180, documentProcessing: 110, aiAnalysis: 85 },
    { date: "Apr", chatMessages: 200, documentProcessing: 130, aiAnalysis: 95 },
    {
      date: "May",
      chatMessages: 220,
      documentProcessing: 140,
      aiAnalysis: 105,
    },
    {
      date: "Jun",
      chatMessages: 250,
      documentProcessing: 160,
      aiAnalysis: 120,
    },
  ];

  const dailyUsage = [
    { day: "Mon", usage: 45 },
    { day: "Tue", usage: 52 },
    { day: "Wed", usage: 38 },
    { day: "Thu", usage: 61 },
    { day: "Fri", usage: 55 },
    { day: "Sat", usage: 28 },
    { day: "Sun", usage: 33 },
  ];

  // Mock credit transaction history
  const creditTransactions: CreditTransaction[] = [
    {
      id: "1",
      date: new Date("2024-11-15"),
      amount: 29,
      type: "purchase",
      description: "Credit Top-up - 1000 Credits",
      credits: 1000,
    },
    {
      id: "2",
      date: new Date("2024-11-14"),
      amount: 0,
      type: "usage",
      description: "Chat conversation with AI",
      credits: -25,
    },
    {
      id: "3",
      date: new Date("2024-11-14"),
      amount: 0,
      type: "usage",
      description: "Document analysis",
      credits: -50,
    },
    {
      id: "4",
      date: new Date("2024-11-01"),
      amount: 29,
      type: "purchase",
      description: "Pro Plan - Monthly Credits",
      credits: 5000,
    },
  ];

  // Available plans with credit-based pricing
  const plans: Plan[] = [
    {
      name: "Free",
      price: 0,
      period: "month",
      features: [
        "100 monthly credits",
        "Basic AI analysis",
        "Standard templates",
        "Email support",
      ],
      credits: 100,
    },
    {
      name: "Pro",
      price: 99000,
      period: "month",
      features: [
        "1,500 credits per month",
        "Advanced AI analysis",
        "Premium templates",
        "AI Chat Assistant",
        "Priority support",
      ],
      credits: 1500,
      popular: true,
    },
    {
      name: "Enterprise",
      price: 499000,
      period: "month",
      features: [
        "5,000 credits per month",
        "Custom AI models",
        "Custom templates",
        "API access",
        "24/7 dedicated support",
      ],
      credits: 5000,
    },
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getTransactionBadge = (type: string) => {
    switch (type) {
      case "purchase":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <Plus className="h-3 w-3 mr-1" />
            Purchase
          </Badge>
        );
      case "usage":
        return (
          <Badge variant="secondary" className="bg-blue-100 text-blue-800">
            <MessageSquare className="h-3 w-3 mr-1" />
            Usage
          </Badge>
        );
      case "refund":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <DollarSign className="h-3 w-3 mr-1" />
            Refund
          </Badge>
        );
      default:
        return <Badge variant="secondary">{type}</Badge>;
    }
  };

  const totalUsedCredits = creditUsage.reduce(
    (sum, usage) => sum + usage.used,
    0
  );

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-20 flex items-center w-full">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="font-semibold">Billing & Credits</h1>
              <p className="text-sm text-muted-foreground">
                Manage your credits and subscription
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8 space-y-8">
        {/* Credit Balance Overview */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Credit Overview</h2>
          <div className="grid gap-6 md:grid-cols-2 mb-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Coins className="h-5 w-5 mr-2 text-primary" />
                  Current Balance
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-3xl font-bold text-muted-foreground mb-2">
                    Loading...
                  </div>
                ) : error ? (
                  <div className="text-3xl font-bold text-destructive mb-2">
                    Error loading credits
                  </div>
                ) : (
                  <div className="text-3xl font-bold text-primary mb-2">
                    {currentCredits.toLocaleString()} Credits
                  </div>
                )}
                <p className="text-sm text-muted-foreground">
                  {currentPlan === "Free"
                    ? `Resets daily • ${dailyCredits} credits per day`
                    : "Monthly subscription credits"}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Crown className="h-5 w-5 mr-2 text-primary" />
                  Current Plan: {currentPlan}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <p className="text-2xl font-bold">
                      Rp
                      {plans
                        .find((p) => p.name === currentPlan)
                        ?.price?.toLocaleString() || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      per{" "}
                      {plans.find((p) => p.name === currentPlan)?.period ||
                        "month"}
                    </p>
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    Active
                  </Badge>
                </div>
                <Button variant="outline" className="w-full" size="sm">
                  Manage Subscription
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Credit Usage Statistics */}
          <Card>
            <CardHeader>
              <CardTitle>Credit Usage This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {creditUsage.map((usage, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="p-2 bg-primary/10 rounded-lg">
                        {usage.icon}
                      </div>
                      <div>
                        <p className="font-medium">{usage.category}</p>
                        <p className="text-sm text-muted-foreground">
                          {usage.used.toLocaleString()} credits used
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">
                        {usage.used.toLocaleString()}
                      </p>
                      <p className="text-sm text-muted-foreground">credits</p>
                    </div>
                  </div>
                ))}
                <Separator />
                <div className="flex items-center justify-between font-medium">
                  <span>Total Used</span>
                  <span>{totalUsedCredits.toLocaleString()} credits</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Analytics Section */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Usage Analytics</h2>

          {/* Usage Overview Cards */}
          <div className="grid gap-6 md:grid-cols-3 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Usage This Month
                </CardTitle>
                <BarChart3 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {totalUsedCredits.toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">
                  +12% from last month
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Average Daily Usage
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {Math.round(totalUsedCredits / 30).toLocaleString()}
                </div>
                <p className="text-xs text-muted-foreground">Credits per day</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Most Used Feature
                </CardTitle>
                <MessageSquare className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">Chat Messages</div>
                <p className="text-xs text-muted-foreground">
                  {creditUsage[0]?.used.toLocaleString()} credits used
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Usage Charts */}
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Usage Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Usage Trends (Last 6 Months)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Track your credit usage patterns over time
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={usageAnalytics}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="chatMessages"
                        stroke="#8884d8"
                        strokeWidth={2}
                        name="Chat Messages"
                      />
                      <Line
                        type="monotone"
                        dataKey="documentProcessing"
                        stroke="#82ca9d"
                        strokeWidth={2}
                        name="Document Processing"
                      />
                      <Line
                        type="monotone"
                        dataKey="aiAnalysis"
                        stroke="#ffc658"
                        strokeWidth={2}
                        name="AI Analysis"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            {/* Daily Usage Bar Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Usage (This Week)</CardTitle>
                <p className="text-sm text-muted-foreground">
                  Your credit consumption by day of the week
                </p>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={dailyUsage}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="day" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="usage"
                        fill="#8884d8"
                        name="Credits Used"
                        radius={[4, 4, 0, 0]}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Transaction History */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Transaction History</h2>
          <Card>
            <CardHeader>
              <CardTitle>Credit Transaction History</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track all your credit purchases and usage
              </p>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {creditTransactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex items-center space-x-4">
                      <div>{getTransactionBadge(transaction.type)}</div>
                      <div>
                        <p className="font-medium">{transaction.description}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(transaction.date)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={`font-medium ${
                          transaction.credits > 0
                            ? "text-green-600"
                            : "text-red-600"
                        }`}
                      >
                        {transaction.credits > 0 ? "+" : ""}
                        {transaction.credits.toLocaleString()} credits
                      </p>
                      {transaction.amount > 0 && (
                        <p className="text-sm text-muted-foreground">
                          Rp{transaction.amount.toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
