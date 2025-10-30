import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { createPayment, PaymentRequest } from '@/lib/payment';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Selalu cari user berdasarkan email untuk memastikan data terbaru
    const user = await prisma.user.findUnique({
      where: { email: session.user.email }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Gunakan ID dari database
    const userId = user.id;

    const { bookingId } = await request.json();

    if (!bookingId) {
      return NextResponse.json(
        { error: 'Booking ID is required' },
        { status: 400 }
      );
    }

    // Find the booking
    const booking = await (prisma as any).consultantBooking.findFirst({
      where: {
        id: bookingId,
        clientId: user.id,
      },
      include: {
        consultant: {
          include: {
            user: true,
          },
        },
        payment: true,
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Check if payment already exists and is successful
    if (booking.payment && booking.payment.status === 'PAID') {
      return NextResponse.json(
        { error: 'Booking is already paid' },
        { status: 400 }
      );
    }

    // Calculate total amount (booking amount + any fees)
    const totalAmount = booking.totalAmount;

    // Prepare payment request
    const paymentRequest: PaymentRequest = {
      amount: totalAmount,
      orderItems: [
        {
          name: `Consultation with ${booking.consultant.user.name}`,
          price: totalAmount,
          quantity: 1,
        },
      ],
      customerName: user.name || 'Customer',
      customerEmail: user.email,
      customerPhone: '', // Add phone field to user model if needed
      orderId: booking.id,
      expiredTime: 86400, // 24 hours
    };

    // Create payment with payment gateway
    const paymentResponse = await createPayment(paymentRequest);

    if (!paymentResponse.success) {
      return NextResponse.json(
        { error: paymentResponse.error || 'Payment creation failed' },
        { status: 400 }
      );
    }

    // Create or update payment record in database
    const paymentData = {
      bookingId: booking.id,
      paymentReference: paymentResponse.data!.reference,
      paymentMethod: paymentResponse.data!.payment_method,
      paymentName: paymentResponse.data!.payment_name,
      amount: paymentResponse.data!.amount,
      feeMerchant: paymentResponse.data!.fee_merchant,
      feeCustomer: paymentResponse.data!.fee_customer,
      amountReceived: paymentResponse.data!.amount_received,
      status: paymentResponse.data!.status,
      paidAt: null,
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

    // Update booking status to pending payment
    await (prisma as any).consultantBooking.update({
      where: { id: booking.id },
      data: { status: 'pending_payment' },
    });

    return NextResponse.json({
      success: true,
      data: {
        paymentUrl: paymentResponse.data!.checkout_url,
        reference: paymentResponse.data!.reference,
        amount: paymentResponse.data!.amount,
        expiredTime: paymentResponse.data!.expired_time,
      },
    });
  } catch (error) {
    console.error('Error creating payment:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}