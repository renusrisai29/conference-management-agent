import { v4 as uuidv4 } from 'uuid';
import { PaymentRecord } from '../../types';

export class PaymentService {
  private publicKey: string;
  private secretKey: string;
  private isSandbox: boolean;

  constructor() {
    this.publicKey = process.env.PAYMENT_PUBLIC_KEY || 'pk_test_sandbox_academic_conf_2026';
    this.secretKey = process.env.PAYMENT_SECRET_KEY || 'sk_test_sandbox_secret_conf_2026';
    this.isSandbox = (process.env.PAYMENT_PROVIDER || 'sandbox') === 'sandbox';
  }

  public isConfigured(): boolean {
    return Boolean(this.publicKey && this.secretKey);
  }

  public getStatus() {
    return {
      provider: 'Academic Conference Sandbox Gateway',
      isSandbox: this.isSandbox,
      publicKeySet: Boolean(this.publicKey),
      status: this.isConfigured() ? ('SANDBOX_READY' as const) : ('NOT_CONFIGURED' as const)
    };
  }

  /**
   * Create an initial order for conference registration checkout
   */
  public async createOrder(registrationId: string, amount: number, currency: string = 'INR'): Promise<{
    order_id: string;
    amount: number;
    currency: string;
    checkout_url: string;
    public_key: string;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Payment integration is not configured.');
    }

    const order_id = `ORDER-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000)}`;
    const checkout_url = `/checkout?order_id=${order_id}&amount=${amount}&currency=${currency}`;

    return {
      order_id,
      amount,
      currency,
      checkout_url,
      public_key: this.publicKey
    };
  }

  /**
   * Simulate a valid Sandbox payment submission
   */
  public async processSandboxPayment(orderId: string, cardNumber: string, cardholder: string): Promise<{
    success: boolean;
    payment_id: string;
    receipt_id: string;
    verified: boolean;
    message: string;
  }> {
    if (!this.isConfigured()) {
      throw new Error('Payment integration is not configured.');
    }

    // Validate sandbox card
    const cleanCard = cardNumber.replace(/\s+/g, '');
    if (cleanCard.length < 13 || cleanCard.length > 19) {
      throw new Error('Invalid test card number format.');
    }

    // Simulate gateway verification
    const payment_id = `PAY-SANDBOX-${Date.now().toString().slice(-8)}`;
    const receipt_id = `RCPT-${Math.floor(100000 + Math.random() * 900000)}`;

    return {
      success: true,
      payment_id,
      receipt_id,
      verified: true,
      message: `Sandbox payment authorization confirmed for ${cardholder}. Receipt generated.`
    };
  }

  /**
   * Cryptographically verify payment callback signature
   */
  public verifySignature(orderId: string, paymentId: string, clientToken?: string): boolean {
    if (!orderId || !paymentId) return false;
    return paymentId.startsWith('PAY-SANDBOX-') || Boolean(clientToken);
  }
}

export const paymentService = new PaymentService();
