import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCallbackSignature } from '@/lib/payment';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const callbackSignature = request.headers.get('x-callback-signature') || '';

    // Verify the callback signature
    if (!verifyCallbackSignature(callbackSignature, body)) {
      console.error('Invalid callback signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const {
      reference,
      merchant_ref,
      payment_method,
      payment_name,
      customer_name,
      customer_email,
      amount,
      fee_merchant,
      fee_customer,
      amount_received,
      status,
      paid_at,
    } = body;

    console.log('Payment callback received:', {
      reference,
      merchant_ref,
      status,
      amount,
    });

    // Find the booking by merchant_ref (which should be the booking ID)
    const booking = await (prisma as any).consultantBooking.findFirst({
      where: {
        id: merchant_ref,
      },
      include: {
        payment: true,
      },
    });

    if (!booking) {
      console.error('Booking not found for merchant_ref:', merchant_ref);
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Update or create payment record
    const paymentData = {
      bookingId: booking.id,
      paymentReference: reference,
      paymentMethod: payment_method,
      paymentName: payment_name,
      amount: amount,
      feeMerchant: fee_merchant || 0,
      feeCustomer: fee_customer || 0,
      amountReceived: amount_received || amount,
      status: status,
      paidAt: paid_at ? new Date(paid_at * 1000) : null, // Convert Unix timestamp to Date
    };

    if (booking.payment) {
      // Update existing payment
      await (prisma as any).consultantPayment.update({
        where: { id: booking.payment.id },
        data: paymentData,
      });
    } else {
      // Create new payment record
      await (prisma as any).consultantPayment.create({
        data: paymentData,
      });
    }

    // Update booking status based on payment status
    let bookingStatus = booking.status;
    if (status === 'PAID') {
      bookingStatus = 'confirmed';
    } else if (status === 'EXPIRED' || status === 'FAILED') {
      bookingStatus = 'cancelled';
    }

    if (bookingStatus !== booking.status) {
      await (prisma as any).consultantBooking.update({
        where: { id: booking.id },
        data: { status: bookingStatus },
      });
    }

    // Log the transaction for audit purposes
    console.log('Payment processed successfully:', {
      bookingId: booking.id,
      reference,
      status,
      amount,
      newBookingStatus: bookingStatus,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error processing payment callback:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Handle GET requests for testing
export async function GET(request: NextRequest) {
  return NextResponse.json({
    message: 'Payment callback endpoint is active',
    timestamp: new Date().toISOString(),
  });
}