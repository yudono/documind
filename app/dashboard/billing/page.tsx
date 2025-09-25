"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
} from "lucide-react";

interface UsageData {
  category: string;
  used: number;
  limit: number;
  unit: string;
  icon: React.ReactNode;
}

interface BillingHistory {
  id: string;
  date: Date;
  amount: number;
  status: "paid" | "pending" | "failed";
  description: string;
  invoiceUrl?: string;
}

interface Plan {
  name: string;
  price: number;
  period: string;
  features: string[];
  limits: {
    documents: number;
    aiChats: number;
    storage: number;
  };
  popular?: boolean;
}

export default function BillingPage() {
  const [currentPlan] = useState("UMKM Pro");

  // Mock usage data
  const usageData: UsageData[] = [
    {
      category: "Dokumen Bisnis Diproses",
      used: 127,
      limit: 500,
      unit: "dokumen",
      icon: <FileText className="h-4 w-4" />,
    },
    {
      category: "Konsultasi AI UMKM",
      used: 89,
      limit: 200,
      unit: "sesi",
      icon: <MessageSquare className="h-4 w-4" />,
    },
    {
      category: "Penyimpanan Dokumen",
      used: 1.2,
      limit: 5,
      unit: "GB",
      icon: <BarChart3 className="h-4 w-4" />,
    },
    {
      category: "Analisis Otomatis",
      used: 234,
      limit: 1000,
      unit: "analisis",
      icon: <Zap className="h-4 w-4" />,
    },
  ];

  // Mock billing history
  const billingHistory: BillingHistory[] = [
    {
      id: "1",
      date: new Date("2024-11-01"),
      amount: 149000,
      status: "paid",
      description: "Paket UMKM Pro - November 2024",
      invoiceUrl: "#",
    },
    {
      id: "2",
      date: new Date("2024-10-01"),
      amount: 149000,
      status: "paid",
      description: "Paket UMKM Pro - Oktober 2024",
      invoiceUrl: "#",
    },
    {
      id: "3",
      date: new Date("2024-09-01"),
      amount: 149000,
      status: "paid",
      description: "Paket UMKM Pro - September 2024",
      invoiceUrl: "#",
    },
    {
      id: "4",
      date: new Date("2024-08-01"),
      amount: 149000,
      status: "pending",
      description: "Paket UMKM Pro - Agustus 2024",
    },
  ];

  // Available plans
  const plans: Plan[] = [
    {
      name: "UMKM Starter",
      price: 0,
      period: "bulan",
      features: [
        "25 dokumen bisnis per bulan",
        "50 konsultasi AI",
        "2 GB penyimpanan",
        "Analisis invoice & laporan dasar",
        "Template surat bisnis",
        "Support email",
      ],
      limits: {
        documents: 25,
        aiChats: 50,
        storage: 2,
      },
    },
    {
      name: "UMKM Pro",
      price: 149000,
      period: "bulan",
      features: [
        "500 dokumen bisnis per bulan",
        "200 konsultasi AI UMKM",
        "5 GB penyimpanan",
        "Analisis keuangan mendalam",
        "Konsultasi strategi bisnis",
        "Template kontrak & proposal",
        "Support prioritas WhatsApp",
      ],
      limits: {
        documents: 500,
        aiChats: 200,
        storage: 5,
      },
      popular: true,
    },
    {
      name: "UMKM Enterprise",
      price: 399000,
      period: "bulan",
      features: [
        "Dokumen bisnis unlimited",
        "Konsultasi AI unlimited",
        "20 GB penyimpanan",
        "Analisis bisnis mendalam",
        "Konsultan bisnis dedicated",
        "Integrasi sistem akuntansi",
        "Multi-user untuk tim",
        "Training bisnis UMKM",
        "Laporan analitik lengkap",
      ],
      limits: {
        documents: -1,
        aiChats: -1,
        storage: 20,
      },
    },
  ];

  const formatDate = (date: Date) => {
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "paid":
        return (
          <Badge variant="secondary" className="bg-green-100 text-green-800">
            <CheckCircle className="h-3 w-3 mr-1" />
            Paid
          </Badge>
        );
      case "pending":
        return (
          <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">
            <Clock className="h-3 w-3 mr-1" />
            Pending
          </Badge>
        );
      case "failed":
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Failed
          </Badge>
        );
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getUsageColor = (percentage: number) => {
    if (percentage >= 90) return "bg-red-500";
    if (percentage >= 75) return "bg-yellow-500";
    return "bg-green-500";
  };

  return (
    <div className="min-h-screen">
      {/* Header */}
      <div className="border-b p-4 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 h-20 flex items-center w-full">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center space-x-3">
            <div>
              <h1 className="font-semibold">Tagihan & Penggunaan</h1>
              <p className="text-sm text-muted-foreground">
                Kelola langganan dan pantau penggunaan layanan UMKM Anda
              </p>
            </div>
          </div>
        </div>
      </div>
      <div className="p-8">
        {/* <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Tagihan & Penggunaan</h1>
        <p className="text-slate-600">Kelola langganan dan pantau penggunaan layanan UMKM Anda</p>
      </div> */}

        <Tabs defaultValue="usage" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="usage">Penggunaan</TabsTrigger>
            <TabsTrigger value="billing">Tagihan</TabsTrigger>
            <TabsTrigger value="plans">Paket</TabsTrigger>
          </TabsList>

          {/* Usage Tab */}
          <TabsContent value="usage" className="space-y-6">
            {/* Current Plan Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Crown className="h-5 w-5 mr-2 text-primary" />
                    Current Plan: {currentPlan}
                  </div>
                  <Badge
                    variant="secondary"
                    className="bg-primary/10 text-primary"
                  >
                    Active
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-2xl font-bold">Rp 149.000</p>
                    <p className="text-sm text-muted-foreground">per bulan</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">
                      Tanggal tagihan berikutnya
                    </p>
                    <p className="font-medium">1 Februari 2024</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Usage Statistics */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {usageData.map((item, index) => (
                <Card key={index}>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center">
                      {item.icon}
                      <span className="ml-2">{item.category}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold">
                          {item.used.toLocaleString()}
                        </span>
                        <span className="text-sm text-muted-foreground">
                          {item.limit === -1
                            ? "Unlimited"
                            : `of ${item.limit.toLocaleString()}`}{" "}
                          {item.unit}
                        </span>
                      </div>
                      {item.limit !== -1 && (
                        <div className="space-y-2">
                          <Progress
                            value={getUsagePercentage(item.used, item.limit)}
                            className="h-2"
                          />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>
                              {getUsagePercentage(
                                item.used,
                                item.limit
                              ).toFixed(1)}
                              % used
                            </span>
                            <span>
                              {(item.limit - item.used).toLocaleString()}{" "}
                              remaining
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Usage Alerts */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <AlertCircle className="h-5 w-5 mr-2 text-yellow-500" />
                  Usage Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                    <div className="flex items-center">
                      <FileText className="h-4 w-4 text-yellow-600 mr-2" />
                      <span className="text-sm">
                        You've used 84.7% of your document processing limit
                      </span>
                    </div>
                    <Button variant="outline" size="sm">
                      Upgrade Plan
                    </Button>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <div className="flex items-center">
                      <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                      <span className="text-sm">
                        All other services are within normal usage
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing" className="space-y-6">
            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Method
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-800 rounded flex items-center justify-center">
                      <span className="text-white text-xs font-bold">VISA</span>
                    </div>
                    <div>
                      <p className="font-medium">•••• •••• •••• 4242</p>
                      <p className="text-sm text-muted-foreground">
                        Expires 12/25
                      </p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm">
                    Update
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Billing History */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Calendar className="h-5 w-5 mr-2" />
                    Billing History
                  </div>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {billingHistory.map((bill) => (
                    <div
                      key={bill.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center space-x-4">
                        <div className="flex items-center justify-center w-10 h-10 bg-muted rounded-full">
                          <DollarSign className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium">{bill.description}</p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(bill.date)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-medium">
                            Rp {bill.amount.toLocaleString("id-ID")}
                          </p>
                          {getStatusBadge(bill.status)}
                        </div>
                        {bill.invoiceUrl && (
                          <Button variant="ghost" size="sm">
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Plans Tab */}
          <TabsContent value="plans" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {plans.map((plan, index) => (
                <Card
                  key={index}
                  className={`relative ${
                    plan.popular ? "border-primary shadow-lg" : ""
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground px-3 py-1">
                        <Star className="h-3 w-3 mr-1" />
                        Most Popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center">
                    <CardTitle className="text-xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-3xl font-bold">
                        Rp {plan.price.toLocaleString("id-ID")}
                      </span>
                      <span className="text-muted-foreground">
                        /{plan.period}
                      </span>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <ul className="space-y-2">
                      {plan.features.map((feature, featureIndex) => (
                        <li
                          key={featureIndex}
                          className="flex items-center text-sm"
                        >
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                          {feature}
                        </li>
                      ))}
                    </ul>
                    <Separator />
                    <Button
                      className="w-full"
                      variant={
                        currentPlan === plan.name ? "secondary" : "default"
                      }
                      disabled={currentPlan === plan.name}
                    >
                      {currentPlan === plan.name
                        ? "Current Plan"
                        : `Upgrade to ${plan.name}`}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Plan Comparison */}
            <Card>
              <CardHeader>
                <CardTitle>Plan Comparison</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2">Feature</th>
                        {plans.map((plan) => (
                          <th key={plan.name} className="text-center py-2">
                            {plan.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="space-y-2">
                      <tr className="border-b">
                        <td className="py-2">Documents per month</td>
                        {plans.map((plan) => (
                          <td key={plan.name} className="text-center py-2">
                            {plan.limits.documents === -1
                              ? "Unlimited"
                              : plan.limits.documents.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">AI Chat Messages</td>
                        {plans.map((plan) => (
                          <td key={plan.name} className="text-center py-2">
                            {plan.limits.aiChats === -1
                              ? "Unlimited"
                              : plan.limits.aiChats.toLocaleString()}
                          </td>
                        ))}
                      </tr>
                      <tr className="border-b">
                        <td className="py-2">Storage</td>
                        {plans.map((plan) => (
                          <td key={plan.name} className="text-center py-2">
                            {plan.limits.storage} GB
                          </td>
                        ))}
                      </tr>
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
