import { prisma } from '@/lib/prisma';

export async function resetDailyCredits() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Start of today

    // Find all users who need their daily credits reset
    const usersToReset = await prisma.userCredit.findMany({
      where: {
        OR: [
          // Users whose last reset was before today
          { lastResetDate: { lt: today } }
        ]
      },
      include: {
        user: {
          include: {
            // Include subscription info if we add user subscriptions later
          }
        }
      }
    });

    console.log(`Found ${usersToReset.length} users to reset daily credits`);

    for (const userCredit of usersToReset) {
      // Reset daily used credits to 0
      await prisma.userCredit.update({
        where: { id: userCredit.id },
        data: {
          dailyUsed: 0,
          lastResetDate: today,
        }
      });

      // Create a transaction record for the reset
      await prisma.creditTransaction.create({
        data: {
          userId: userCredit.userId,
          type: 'reset',
          amount: 0,
          description: 'Daily credit usage reset',
          reference: `daily-reset-${today.toISOString().split('T')[0]}`,
        }
      });
    }

    console.log(`Successfully reset daily credits for ${usersToReset.length} users`);
    return { success: true, resetCount: usersToReset.length };
  } catch (error: any) {
    console.error('Error resetting daily credits:', error);
    return { success: false, error: error.message };
  }
}

export async function checkAndResetUserCredits(userId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const userCredit = await prisma.userCredit.findUnique({
      where: { userId }
    });

    if (!userCredit) {
      return { needsReset: false };
    }

    // Check if user needs reset
    const needsReset = !userCredit.lastResetDate || userCredit.lastResetDate < today;

    if (needsReset) {
      // Reset this specific user's daily credits
      await prisma.userCredit.update({
        where: { userId },
        data: {
          dailyUsed: 0,
          lastResetDate: today,
        }
      });

      // Create a transaction record
      await prisma.creditTransaction.create({
        data: {
          userId,
          type: 'reset',
          amount: 0,
          description: 'Daily credit usage reset',
          reference: `daily-reset-${today.toISOString().split('T')[0]}`,
        }
      });

      return { needsReset: true, resetPerformed: true };
    }

    return { needsReset: false };
  } catch (error: any) {
    console.error('Error checking/resetting user credits:', error);
    return { needsReset: false, error: error.message };
  }
}

export async function addDailyCreditsForSubscribers() {
  try {
    // This function would add daily credits for subscription users
    // For now, we'll implement a basic version that could be extended
    // when subscription management is fully implemented
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Find users who might have subscriptions (this is a placeholder)
    // In a real implementation, you'd join with a UserSubscription table
    const subscribedUsers = await prisma.userCredit.findMany({
      where: {
        // Placeholder: users with high daily limits might be subscribers
        dailyLimit: { gt: 50 }
      }
    });

    let creditsAdded = 0;

    for (const userCredit of subscribedUsers) {
      // Check if we already added credits today
      const existingTransaction = await prisma.creditTransaction.findFirst({
        where: {
          userId: userCredit.userId,
          type: 'daily_bonus',
          createdAt: { gte: today }
        }
      });

      if (!existingTransaction) {
        // Add daily subscription credits (example: 10 bonus credits)
        const bonusCredits = 10;
        
        await prisma.userCredit.update({
          where: { id: userCredit.id },
          data: {
            balance: { increment: bonusCredits },
            totalEarned: { increment: bonusCredits }
          }
        });

        await prisma.creditTransaction.create({
          data: {
            userId: userCredit.userId,
            type: 'daily_bonus',
            amount: bonusCredits,
            description: 'Daily subscription bonus credits',
            reference: `daily-bonus-${today.toISOString().split('T')[0]}`,
          }
        });

        creditsAdded += bonusCredits;
      }
    }

    console.log(`Added ${creditsAdded} daily bonus credits to subscribers`);
    return { success: true, creditsAdded };
  } catch (error: any) {
    console.error('Error adding daily credits for subscribers:', error);
    return { success: false, error: error.message };
  }
}