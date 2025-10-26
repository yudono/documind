import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY;

// POST /api/tripay/webhook - Handle Tripay payment notifications
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const callbackSignature = request.headers.get("x-callback-signature");

    if (!callbackSignature) {
      return NextResponse.json({ error: "Missing signature" }, { status: 400 });
    }

    // Verify signature
    const crypto = require("crypto");
    const signature = crypto
      .createHmac("sha256", TRIPAY_PRIVATE_KEY)
      .update(JSON.stringify(body))
      .digest("hex");

    if (signature !== callbackSignature) {
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const { reference, status, merchant_ref, amount } = body;

    // Find the pending transaction
    const transaction = await prisma.creditTransaction.findFirst({
      where: {
        reference: merchant_ref,
        metadata: {
          path: ["status"],
          equals: "pending",
        },
      },
      include: {
        user: {
          include: {
            userCredit: true,
          },
        },
      },
    });

    if (!transaction) {
      console.error("Transaction not found:", merchant_ref);
      return NextResponse.json(
        { error: "Transaction not found" },
        { status: 404 }
      );
    }

    // Handle payment status
    if (status === "PAID") {
      // Initialize user credit if it doesn't exist
      let userCredit = transaction.user.userCredit;
      if (!userCredit) {
        userCredit = await prisma.userCredit.create({
          data: {
            userId: transaction.user.id,
            dailyLimit: 500,
            dailyUsed: 0,
            lastResetDate: new Date(),
          },
        });
      }

      // Update transaction status and add credits to user account
      await prisma.$transaction([
        // Update the transaction status
        prisma.creditTransaction.update({
          where: { id: transaction.id },
          data: {
            metadata: {
              ...(transaction.metadata as any),
              status: "completed",
              tripayReference: reference,
              paidAt: new Date().toISOString(),
            },
          },
        }),
        // Add credits to user account
        prisma.userCredit.update({
          where: { userId: transaction.user.id },
          data: {
            totalEarned: { increment: transaction.amount },
          },
        }),
      ]);

      console.log(
        `Payment completed for user ${transaction.user.email}: +${transaction.amount} credits`
      );
    } else if (status === "EXPIRED" || status === "FAILED") {
      // Update transaction status to failed
      await prisma.creditTransaction.update({
        where: { id: transaction.id },
        data: {
          metadata: {
            ...(transaction.metadata as any),
            status: "failed",
            tripayReference: reference,
            failedAt: new Date().toISOString(),
          },
        },
      });

      console.log(
        `Payment failed for user ${transaction.user.email}: ${merchant_ref}`
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error processing Tripay webhook:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// GET /api/tripay/webhook - Health check
export async function GET() {
  return NextResponse.json({ status: "OK", service: "Tripay Webhook Handler" });
}
