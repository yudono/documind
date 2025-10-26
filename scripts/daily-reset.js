#!/usr/bin/env node

/**
 * Daily Credit Reset Script
 *
 * This script should be run daily (e.g., via cron job) to:
 * 1. Reset daily usage counters for all users
 * 2. Add daily bonus credits for subscription users
 *
 * Usage:
 * node scripts/daily-reset.js
 *
 * Or add to crontab to run daily at midnight:
 * 0 0 * * * cd /path/to/your/app && node scripts/daily-reset.js
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function resetDailyCredits() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log(`Starting daily credit reset for ${today.toISOString()}`);

    // Find all users who need their daily credits reset
    const usersToReset = await prisma.userCredit.findMany({
      where: {
        OR: [{ lastResetDate: null }, { lastResetDate: { lt: today } }],
      },
      include: {
        user: true,
      },
    });

    console.log(`Found ${usersToReset.length} users to reset`);

    let resetCount = 0;
    let errorCount = 0;

    for (const userCredit of usersToReset) {
      try {
        // Reset daily used credits to 0
        await prisma.userCredit.update({
          where: { id: userCredit.id },
          data: {
            dailyUsed: 0,
            lastResetDate: today,
          },
        });

        // Create a transaction record for the reset
        await prisma.creditTransaction.create({
          data: {
            userId: userCredit.userId,
            type: "reset",
            amount: 0,
            description: "Daily credit usage reset",
            reference: `daily-reset-${today.toISOString().split("T")[0]}`,
          },
        });

        resetCount++;

        if (resetCount % 100 === 0) {
          console.log(`Reset ${resetCount} users so far...`);
        }
      } catch (error) {
        console.error(
          `Error resetting credits for user ${userCredit.userId}:`,
          error
        );
        errorCount++;
      }
    }

    console.log(
      `✅ Daily reset completed: ${resetCount} users reset, ${errorCount} errors`
    );
    return { success: true, resetCount, errorCount };
  } catch (error) {
    console.error("❌ Error during daily reset:", error);
    return { success: false, error: error.message };
  }
}

async function addDailyBonusCredits() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    console.log("Adding daily bonus credits for subscribers...");

    // Find users who might have subscriptions (high daily limits)
    const subscribedUsers = await prisma.userCredit.findMany({
      where: {
        dailyLimit: { gt: 50 }, // Assuming subscribers have higher limits
      },
    });

    console.log(`Found ${subscribedUsers.length} potential subscribers`);

    let bonusCount = 0;
    let totalBonusCredits = 0;

    for (const userCredit of subscribedUsers) {
      try {
        // Check if we already added bonus credits today
        const existingBonus = await prisma.creditTransaction.findFirst({
          where: {
            userId: userCredit.userId,
            type: "daily_bonus",
            createdAt: { gte: today },
          },
        });

        if (!existingBonus) {
          // Add daily subscription bonus credits
          const bonusCredits = 10; // Configurable bonus amount

          await prisma.userCredit.update({
            where: { id: userCredit.id },
            data: {
              dailyLimit: { increment: bonusCredits },
              totalEarned: { increment: bonusCredits },
            },
          });

          await prisma.creditTransaction.create({
            data: {
              userId: userCredit.userId,
              type: "daily_bonus",
              amount: bonusCredits,
              description: "Daily subscription bonus credits",
              reference: `daily-bonus-${today.toISOString().split("T")[0]}`,
            },
          });

          bonusCount++;
          totalBonusCredits += bonusCredits;
        }
      } catch (error) {
        console.error(
          `Error adding bonus credits for user ${userCredit.userId}:`,
          error
        );
      }
    }

    console.log(
      `✅ Bonus credits added: ${bonusCount} users received ${totalBonusCredits} total credits`
    );
    return { success: true, bonusCount, totalBonusCredits };
  } catch (error) {
    console.error("❌ Error adding bonus credits:", error);
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log("🚀 Starting daily credit management tasks...");

  try {
    // Perform daily reset
    const resetResult = await resetDailyCredits();

    // Add bonus credits for subscribers
    const bonusResult = await addDailyBonusCredits();

    // Summary
    console.log("\n📊 Daily Credit Management Summary:");
    console.log(
      `Reset: ${resetResult.success ? "✅" : "❌"} ${
        resetResult.resetCount || 0
      } users`
    );
    console.log(
      `Bonus: ${bonusResult.success ? "✅" : "❌"} ${
        bonusResult.totalBonusCredits || 0
      } credits added`
    );

    if (resetResult.success && bonusResult.success) {
      console.log("\n🎉 All daily credit tasks completed successfully!");
      process.exit(0);
    } else {
      console.log("\n⚠️  Some tasks failed. Check logs above.");
      process.exit(1);
    }
  } catch (error) {
    console.error("💥 Fatal error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the script
if (require.main === module) {
  main();
}

module.exports = { resetDailyCredits, addDailyBonusCredits };
