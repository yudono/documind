import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// POST /api/credits/topup - Add credits to user account
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
      include: {
        userCredit: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { packageId, paymentMethod, transactionId } = await request.json();

    if (!packageId || !paymentMethod || !transactionId) {
      return NextResponse.json(
        { error: 'Package ID, payment method, and transaction ID are required' },
        { status: 400 }
      );
    }

    // Get the credit package details
    const creditPackage = await prisma.creditPackage.findUnique({
      where: { id: packageId },
    });

    if (!creditPackage || !creditPackage.isActive) {
      return NextResponse.json(
        { error: 'Invalid or inactive credit package' },
        { status: 400 }
      );
    }

    // Initialize user credit if it doesn't exist
    let userCredit = user.userCredit;
    if (!userCredit) {
      userCredit = await prisma.userCredit.create({
        data: {
          userId: user.id,
          balance: 0,
          dailyLimit: 500,
          lastResetDate: new Date(),
        },
      });
    }

    // Add credits to user account and record transaction
    const updatedCredit = await prisma.$transaction([
      prisma.userCredit.update({
        where: { userId: user.id },
        data: {
          balance: { increment: creditPackage.credits },
          totalEarned: { increment: creditPackage.credits },
        },
      }),
      prisma.creditTransaction.create({
        data: {
          userId: user.id,
          type: 'topup',
          amount: creditPackage.credits,
          description: `Credit top-up: ${creditPackage.name}`,
          reference: transactionId,
          metadata: {
            packageId: creditPackage.id,
            packageName: creditPackage.name,
            paymentMethod,
            price: creditPackage.price,
          },
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
      message: `Successfully added ${creditPackage.credits} credits to your account`,
      creditBalance: updatedCredit[0].balance,
      transaction: {
        id: updatedCredit[1].id,
        amount: creditPackage.credits,
        packageName: creditPackage.name,
        transactionId,
      },
    });

  } catch (error) {
    console.error('Error in credit top-up:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}