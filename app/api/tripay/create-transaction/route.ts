import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

// Tripay API configuration
const TRIPAY_API_KEY = process.env.TRIPAY_API_KEY;
const TRIPAY_PRIVATE_KEY = process.env.TRIPAY_PRIVATE_KEY;
const TRIPAY_MERCHANT_CODE = process.env.TRIPAY_MERCHANT_CODE;
const TRIPAY_BASE_URL = process.env.TRIPAY_BASE_URL || 'https://tripay.co.id/api-sandbox';

// POST /api/tripay/create-transaction - Create Tripay payment transaction
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
      where: { email: session.user.email },
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const { packageId, paymentMethod, customAmount } = await request.json();

    if (!paymentMethod) {
      return NextResponse.json(
        { error: 'Payment method is required' },
        { status: 400 }
      );
    }

    const RATE_IDR_PER_CREDIT = Number(process.env.CREDIT_IDR_PER_CREDIT || 1000);
    const MIN_TOPUP_IDR = Number(process.env.TOPUP_MIN_AMOUNT_IDR || 50000);

    let amountIdr: number;
    let creditsAwarded: number;
    let orderItem: { sku: string; name: string; price: number; quantity: number; product_url: string; image_url: string };
    let metadata: any = { paymentMethod };

    if (packageId) {
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

      amountIdr = creditPackage.price;
      creditsAwarded = creditPackage.credits;
      orderItem = {
        sku: creditPackage.id,
        name: creditPackage.name,
        price: creditPackage.price,
        quantity: 1,
        product_url: `${process.env.NEXTAUTH_URL}/dashboard/billing`,
        image_url: `${process.env.NEXTAUTH_URL}/logo/logo.png`,
      };
      metadata = {
        ...metadata,
        packageId: creditPackage.id,
        packageName: creditPackage.name,
        price: creditPackage.price,
        source: 'package',
      };
    } else if (typeof customAmount === 'number') {
      if (customAmount < MIN_TOPUP_IDR) {
        return NextResponse.json(
          { error: `Minimum top-up is Rp ${MIN_TOPUP_IDR.toLocaleString()}` },
          { status: 400 }
        );
      }
      amountIdr = customAmount;
      creditsAwarded = Math.floor(customAmount / RATE_IDR_PER_CREDIT);
      orderItem = {
        sku: `CUSTOM-${user.id}`,
        name: `Custom Top-up (${creditsAwarded} credits)`,
        price: customAmount,
        quantity: 1,
        product_url: `${process.env.NEXTAUTH_URL}/dashboard/billing`,
        image_url: `${process.env.NEXTAUTH_URL}/logo/logo.png`,
      };
      metadata = {
        ...metadata,
        source: 'custom',
        customAmountIdr: customAmount,
        calculatedCredits: creditsAwarded,
        rateIdrPerCredit: RATE_IDR_PER_CREDIT,
      };
    } else {
      return NextResponse.json(
        { error: 'Provide either packageId or customAmount' },
        { status: 400 }
      );
    }

    // Generate unique merchant reference
    const merchantRef = `TOPUP-${user.id}-${Date.now()}`;
    
    // Create signature for Tripay API
    const signatureString = `${TRIPAY_MERCHANT_CODE}${merchantRef}${amountIdr}`;
    const crypto = require('crypto');
    const signature = crypto
      .createHmac('sha256', TRIPAY_PRIVATE_KEY)
      .update(signatureString)
      .digest('hex');

    // Prepare Tripay transaction data
    const tripayData = {
      method: paymentMethod,
      merchant_ref: merchantRef,
      amount: amountIdr,
      customer_name: user.name || user.email,
      customer_email: user.email,
      order_items: [orderItem],
      return_url: `${process.env.NEXTAUTH_URL}/dashboard/billing?status=success`,
      expired_time: Math.floor(Date.now() / 1000) + (24 * 60 * 60), // 24 hours
      signature: signature,
    };

    // Call Tripay API
    const tripayResponse = await fetch(`${TRIPAY_BASE_URL}/transaction/create`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TRIPAY_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(tripayData),
    });

    const tripayResult = await tripayResponse.json();

    if (!tripayResponse.ok || !tripayResult.success) {
      console.error('Tripay API error:', tripayResult);
      return NextResponse.json(
        { error: 'Failed to create payment transaction' },
        { status: 500 }
      );
    }

    // Store pending transaction in database
    const pendingTransaction = await prisma.creditTransaction.create({
      data: {
        userId: user.id,
        type: 'topup',
        amount: creditsAwarded,
        description: packageId ? `Pending credit top-up: ${metadata.packageName}` : `Pending custom credit top-up (${creditsAwarded} credits)`,
        reference: merchantRef,
        metadata: {
          ...metadata,
          tripayReference: tripayResult.data.reference,
          status: 'pending',
        },
      },
    });

    return NextResponse.json({
      success: true,
      transaction: {
        id: pendingTransaction.id,
        merchantRef: merchantRef,
        tripayReference: tripayResult.data.reference,
        paymentUrl: tripayResult.data.checkout_url,
        qrUrl: tripayResult.data.qr_url,
        amount: amountIdr,
        packageName: metadata.packageName || 'Custom Top-up',
        credits: creditsAwarded,
        expiredTime: tripayResult.data.expired_time,
      },
    });

  } catch (error) {
    console.error('Error creating Tripay transaction:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}