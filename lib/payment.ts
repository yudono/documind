import crypto from 'crypto';

// Payment gateway configuration
const PAYMENT_CONFIG = {
  merchantCode: process.env.TRIPAY_MERCHANT_CODE || 'T4338',
  apiKey: process.env.TRIPAY_API_KEY || 'DEV-8IUrPWo76fDjLI0TSHHIX1Sjc5q3EawEbRnnTHx6',
  baseUrl: process.env.TRIPAY_BASE_URL || 'https://tripay.co.id/api-sandbox', // Using sandbox for development
  callbackUrl: process.env.NEXTAUTH_URL + '/api/payment/callback',
  returnUrl: process.env.NEXTAUTH_URL + '/dashboard/consultants/booking-success',
};

export interface PaymentRequest {
  amount: number;
  orderItems: Array<{
    name: string;
    price: number;
    quantity: number;
  }>;
  customerName: string;
  customerEmail: string;
  customerPhone?: string;
  orderId: string;
  expiredTime?: number; // in seconds, default 24 hours
}

export interface PaymentResponse {
  success: boolean;
  data?: {
    reference: string;
    merchant_ref: string;
    payment_selection_type: string;
    payment_method: string;
    payment_name: string;
    customer_name: string;
    customer_email: string;
    customer_phone: string;
    callback_url: string;
    return_url: string;
    amount: number;
    fee_merchant: number;
    fee_customer: number;
    total_fee: number;
    amount_received: number;
    pay_code: string;
    pay_url: string;
    checkout_url: string;
    status: string;
    expired_time: number;
    order_items: Array<{
      name: string;
      price: number;
      quantity: number;
    }>;
  };
  error?: string;
}

export interface PaymentChannel {
  code: string;
  name: string;
  type: string;
  fee_merchant: {
    flat: number;
    percent: number;
  };
  fee_customer: {
    flat: number;
    percent: number;
  };
  total_fee: {
    flat: number;
    percent: number;
  };
  minimum_fee: number;
  maximum_fee: number;
  icon_url: string;
  active: boolean;
}

// Generate signature for payment creation (closed payment)
function generatePaymentSignature(merchantCode: string, merchantRef: string, amount: number): string {
  // For closed payment: merchant_code + merchant_ref + amount
  const stringToSign = merchantCode + merchantRef + amount;
  
  console.log('Generating payment signature with:', {
    merchantCode,
    merchantRef,
    amount,
    stringToSign,
    apiKeyLength: PAYMENT_CONFIG.apiKey.length
  });
  
  return crypto
    .createHmac('sha256', PAYMENT_CONFIG.apiKey)
    .update(stringToSign)
    .digest('hex');
}

// Generate signature for API requests (GET operations)
function generateApiSignature(method: string, url: string, body: any = null): string {
  const payload = body ? JSON.stringify(body) : '';
  const stringToSign = method.toUpperCase() + '|' + url + '|' + payload;
  
  return crypto
    .createHmac('sha256', PAYMENT_CONFIG.apiKey)
    .update(stringToSign)
    .digest('hex');
}

// Get available payment channels
export async function getPaymentChannels(): Promise<PaymentChannel[]> {
  try {
    const url = `${PAYMENT_CONFIG.baseUrl}/payment/channel`;
    const signature = generateApiSignature('GET', url);

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYMENT_CONFIG.apiKey}`,
        'X-Signature': signature,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    
    if (result.success) {
      return result.data.filter((channel: PaymentChannel) => channel.active);
    }
    
    throw new Error(result.message || 'Failed to fetch payment channels');
  } catch (error) {
    console.error('Error fetching payment channels:', error);
    return [];
  }
}

// Create payment transaction
export async function createPayment(paymentData: PaymentRequest): Promise<PaymentResponse> {
  try {
    const url = `${PAYMENT_CONFIG.baseUrl}/transaction/create`;
    
    // Generate signature using merchant_code + merchant_ref + amount
     const signature = generatePaymentSignature(
       PAYMENT_CONFIG.merchantCode,
       paymentData.orderId,
       paymentData.amount
     );

    // Create request body with signature
    const body = {
      method: 'QRIS', // Default to QRIS, can be changed based on user selection
      merchant_ref: paymentData.orderId,
      amount: paymentData.amount,
      customer_name: paymentData.customerName,
      customer_email: paymentData.customerEmail,
      customer_phone: paymentData.customerPhone || '',
      callback_url: PAYMENT_CONFIG.callbackUrl,
      return_url: PAYMENT_CONFIG.returnUrl,
      expired_time: Math.floor(Date.now() / 1000) + (paymentData.expiredTime || 86400), // 24 hours default
      order_items: paymentData.orderItems,
      signature,
    };

    console.log('Payment request:', {
      url,
      merchantCode: PAYMENT_CONFIG.merchantCode,
      apiKeyLength: PAYMENT_CONFIG.apiKey?.length,
      signature: signature.substring(0, 10) + '...',
      amount: body.amount,
      merchant_ref: body.merchant_ref
    });

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${PAYMENT_CONFIG.apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();
    
    console.log('Payment response:', {
      status: response.status,
      success: result.success,
      message: result.message,
      errors: result.errors
    });
    
    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }
    
    return {
      success: false,
      error: result.message || result.errors || 'Payment creation failed',
    };
  } catch (error) {
    console.error('Error creating payment:', error);
    return {
      success: false,
      error: 'Network error occurred',
    };
  }
}

// Check payment status
export async function checkPaymentStatus(reference: string): Promise<any> {
  try {
    const url = `${PAYMENT_CONFIG.baseUrl}/transaction/detail`;
    const signature = generateApiSignature('GET', url);

    const response = await fetch(`${url}?reference=${reference}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${PAYMENT_CONFIG.apiKey}`,
        'X-Signature': signature,
        'Content-Type': 'application/json',
      },
    });

    const result = await response.json();
    return result;
  } catch (error) {
    console.error('Error checking payment status:', error);
    return { success: false, error: 'Failed to check payment status' };
  }
}

// Verify callback signature
export function verifyCallbackSignature(callbackSignature: string, body: any): boolean {
  try {
    const payload = JSON.stringify(body);
    const expectedSignature = crypto
      .createHmac('sha256', PAYMENT_CONFIG.apiKey)
      .update(payload)
      .digest('hex');
    
    return callbackSignature === expectedSignature;
  } catch (error) {
    console.error('Error verifying callback signature:', error);
    return false;
  }
}

export { PAYMENT_CONFIG };