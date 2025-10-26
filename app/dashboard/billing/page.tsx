"use client";

import { useState } from "react";
import { useUserCredit } from "@/hooks/useUserCredit";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Crown,
  Coins,
  Plus,
  MessageSquare,
  DollarSign,
  CreditCard,
  Loader2,
} from "lucide-react";

interface Transaction {
  id: string;
  date: Date;
  amount: number;
  type: "purchase" | "usage" | "refund";
  description: string;
  credits: number;
}

interface CreditPackage {
  id: string;
  name: string;
  description: string;
  credits: number;
  price: number;
  currency: string;
  isPopular?: boolean;
  bonusCredits?: number;
  totalCredits: number;
}

export default function BillingPage() {
  const [currentPlan] = useState("Pro");
  const [isTopupOpen, setIsTopupOpen] = useState(false);
  const [packages, setPackages] = useState<CreditPackage[]>([]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [packagesLoading, setPackagesLoading] = useState(false);
  const { userCredit, loading, error } = useUserCredit();

  // Env-configured rate and minimum (fallbacks provided)
  const RATE_IDR_PER_CREDIT = Number(
    process.env.NEXT_PUBLIC_CREDIT_IDR_PER_CREDIT || 1000
  );
  const MIN_TOPUP_IDR = Number(
    process.env.NEXT_PUBLIC_TOPUP_MIN_AMOUNT_IDR || 50000
  );

  // Custom amount state
  const [customAmount, setCustomAmount] = useState<number | "">("");

  // Use real credit data or fallback to defaults
  const currentCredits = userCredit?.balance || 0;
  const dailyCredits = userCredit?.dailyLimit || 500;

  // Sample transaction history
  const transactions: Transaction[] = [
    {
      id: "1",
      date: new Date("2024-11-15"),
      amount: 29000,
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
      amount: 99000,
      type: "purchase",
      description: "Pro Plan - Monthly Credits",
      credits: 1500,
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

  // Fetch available credit packages
  const fetchPackages = async () => {
    setPackagesLoading(true);
    try {
      const response = await fetch("/api/credits/packages");
      if (response.ok) {
        const data = await response.json();
        setPackages(data.packages);
      }
    } catch (error) {
      console.error("Error fetching packages:", error);
    } finally {
      setPackagesLoading(false);
    }
  };

  // Handle top-up with Tripay (supports package or custom amount)
  const handleTopup = async (
    paymentMethod: string,
    customAmountParam?: number
  ) => {
    const amt =
      typeof customAmountParam === "number"
        ? customAmountParam
        : typeof customAmount === "number"
        ? customAmount
        : 0;
    if (!amt || amt < MIN_TOPUP_IDR) {
      alert(`Minimum top-up is Rp ${MIN_TOPUP_IDR.toLocaleString()}`);
      return;
    }

    setIsProcessing(true);
    try {
      const payload = { customAmount: amt, paymentMethod };

      const response = await fetch("/api/tripay/create-transaction", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        // Redirect to Tripay payment page
        window.open(data.transaction.paymentUrl, "_blank");
        setIsTopupOpen(false);
        setCustomAmount("");
      } else {
        alert(
          "Failed to create payment transaction: " +
            (data.error || "Unknown error")
        );
      }
    } catch (error) {
      console.error("Error creating transaction:", error);
      alert("Failed to create payment transaction");
    } finally {
      setIsProcessing(false);
    }
  };

  // Open top-up modal and fetch packages
  const openTopupModal = () => {
    setIsTopupOpen(true);
  };

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
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">Credit Overview</h2>
            <Button
              onClick={openTopupModal}
              className="flex items-center gap-2"
            >
              <CreditCard className="h-4 w-4" />
              Top Up Credits
            </Button>
          </div>
          <div className="mb-8">
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
          </div>
        </section>

        {/* Transaction History */}
        <section>
          <h2 className="text-2xl font-bold mb-6">Transaction History</h2>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Recent Transactions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {transactions.map((transaction) => (
                  <div
                    key={transaction.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          {getTransactionBadge(transaction.type)}
                          <span className="font-medium">
                            {transaction.description}
                          </span>
                        </div>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(transaction.date)}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="flex items-center gap-2">
                        <span
                          className={`font-medium ${
                            transaction.credits > 0
                              ? "text-green-600"
                              : "text-red-600"
                          }`}
                        >
                          {transaction.credits > 0 ? "+" : ""}
                          {transaction.credits} credits
                        </span>
                      </div>
                      {transaction.amount > 0 && (
                        <span className="text-sm text-muted-foreground">
                          Rp {transaction.amount.toLocaleString()}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Top-up Modal */}
        <Dialog open={isTopupOpen} onOpenChange={setIsTopupOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Top Up Credits
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4">
              <p className="text-muted-foreground">
                Enter a custom amount (min Rp {MIN_TOPUP_IDR.toLocaleString()}).
              </p>

              {/* Custom amount input */}
              <div className="space-y-3 border rounded-md p-4">
                <div className="grid gap-2 md:grid-cols-3 items-center">
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium">
                      Custom Amount (IDR)
                    </label>
                    <Input
                      type="number"
                      min={MIN_TOPUP_IDR}
                      placeholder={MIN_TOPUP_IDR.toString()}
                      value={customAmount === "" ? "" : customAmount}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        setCustomAmount(Number.isFinite(val) ? val : "");
                      }}
                    />
                  </div>
                  <div className="">
                    <div className="text-sm text-muted-foreground">Credits</div>
                    <div className="text-xl font-semibold">
                      {typeof customAmount === "number"
                        ? Math.floor(customAmount / RATE_IDR_PER_CREDIT)
                        : 0}
                    </div>
                  </div>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Button
                    onClick={() =>
                      handleTopup(
                        "BRIVA",
                        typeof customAmount === "number"
                          ? customAmount
                          : undefined
                      )
                    }
                    disabled={
                      isProcessing ||
                      !(
                        typeof customAmount === "number" &&
                        customAmount >= MIN_TOPUP_IDR
                      )
                    }
                    className="justify-start"
                    variant="outline"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    BRI Virtual Account
                  </Button>
                  <Button
                    onClick={() =>
                      handleTopup(
                        "BCAVA",
                        typeof customAmount === "number"
                          ? customAmount
                          : undefined
                      )
                    }
                    disabled={
                      isProcessing ||
                      !(
                        typeof customAmount === "number" &&
                        customAmount >= MIN_TOPUP_IDR
                      )
                    }
                    className="justify-start"
                    variant="outline"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    BCA Virtual Account
                  </Button>
                  <Button
                    onClick={() =>
                      handleTopup(
                        "MANDIRIVA",
                        typeof customAmount === "number"
                          ? customAmount
                          : undefined
                      )
                    }
                    disabled={
                      isProcessing ||
                      !(
                        typeof customAmount === "number" &&
                        customAmount >= MIN_TOPUP_IDR
                      )
                    }
                    className="justify-start"
                    variant="outline"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    Mandiri Virtual Account
                  </Button>
                  <Button
                    onClick={() =>
                      handleTopup(
                        "QRIS",
                        typeof customAmount === "number"
                          ? customAmount
                          : undefined
                      )
                    }
                    disabled={
                      isProcessing ||
                      !(
                        typeof customAmount === "number" &&
                        customAmount >= MIN_TOPUP_IDR
                      )
                    }
                    className="justify-start"
                    variant="outline"
                  >
                    {isProcessing ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <CreditCard className="h-4 w-4 mr-2" />
                    )}
                    QRIS
                  </Button>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
