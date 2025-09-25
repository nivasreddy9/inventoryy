import Razorpay from 'razorpay';
import Stripe from 'stripe';
import axios from 'axios';

class PaymentService {
  constructor() {
    if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
      this.razorpay = new Razorpay({
        key_id: process.env.RAZORPAY_KEY_ID,
        key_secret: process.env.RAZORPAY_KEY_SECRET,
      });
    }
    if (process.env.STRIPE_SECRET_KEY) {
      this.stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
    }
  }

  async initiatePayment(provider, data) {
    switch (provider) {
      case 'razorpay':
        return await this.initiateRazorpayPayment(data);
      case 'stripe':
        return await this.initiateStripePayment(data);
      case 'paytm':
        return await this.initiatePaytmPayment(data);
      case 'phonepe':
        return await this.initiatePhonePePayment(data);
      case 'googlepay':
        return await this.initiateGooglePayPayment(data);
      default:
        throw new Error('Unsupported provider');
    }
  }

  async verifyPaymentStatus(provider, paymentId) {
    switch (provider) {
      case 'razorpay':
        return await this.verifyRazorpayStatus(paymentId);
      case 'stripe':
        return await this.verifyStripeStatus(paymentId);
      case 'paytm':
        return await this.verifyPaytmStatus(paymentId);
      case 'phonepe':
        return await this.verifyPhonePeStatus(paymentId);
      case 'googlepay':
        return await this.verifyGooglePayStatus(paymentId);
      default:
        throw new Error('Unsupported provider');
    }
  }

  async initiateRefund(provider, data) {
    switch (provider) {
      case 'razorpay':
        return await this.initiateRazorpayRefund(data);
      case 'stripe':
        return await this.initiateStripeRefund(data);
      case 'paytm':
        return await this.initiatePaytmRefund(data);
      case 'phonepe':
        return await this.initiatePhonePeRefund(data);
      case 'googlepay':
        return await this.initiateGooglePayRefund(data);
      default:
        throw new Error('Unsupported provider');
    }
  }

  // Razorpay implementations
  async initiateRazorpayPayment(data) {
    if (!this.razorpay) throw new Error('Razorpay not configured');
    const options = {
      amount: data.amount * 100, // Razorpay expects amount in paisa
      currency: data.currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };
    const order = await this.razorpay.orders.create(options);
    return { id: order.id, url: null, token: null }; // Razorpay uses order ID
  }

  async verifyRazorpayStatus(paymentId) {
    if (!this.razorpay) throw new Error('Razorpay not configured');
    const payment = await this.razorpay.payments.fetch(paymentId);
    return payment.status === 'captured' ? 'completed' : payment.status;
  }

  async initiateRazorpayRefund(data) {
    if (!this.razorpay) throw new Error('Razorpay not configured');
    const refund = await this.razorpay.payments.refund(data.paymentId, {
      amount: data.refundAmount * 100,
    });
    return { id: refund.id, status: refund.status };
  }

  // Stripe implementations
  async initiateStripePayment(data) {
    if (!this.stripe) throw new Error('Stripe not configured');
    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: data.currency,
          product_data: { name: 'Payment' },
          unit_amount: data.amount * 100,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });
    return { id: session.id, url: session.url, token: null };
  }

  async verifyStripeStatus(paymentId) {
    if (!this.stripe) throw new Error('Stripe not configured');
    const session = await this.stripe.checkout.sessions.retrieve(paymentId);
    return session.payment_status === 'paid' ? 'completed' : 'pending';
  }

  async initiateStripeRefund(data) {
    if (!this.stripe) throw new Error('Stripe not configured');
    const refund = await this.stripe.refunds.create({
      payment_intent: data.paymentId,
      amount: data.refundAmount * 100,
    });
    return { id: refund.id, status: refund.status };
  }

  // Paytm implementations
  async initiatePaytmPayment(data) {
    // Example implementation using Paytm API
    // You need to replace with actual Paytm integration code and credentials
    const response = await axios.post(process.env.PAYTM_INITIATE_URL, {
      amount: data.amount,
      currency: data.currency,
      customerInfo: data.customerInfo,
      paymentMethod: data.paymentMethod,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.PAYTM_API_KEY,
      }
    });
    return { id: response.data.orderId, url: response.data.paymentUrl, token: null };
  }

  async verifyPaytmStatus(paymentId) {
    const response = await axios.get(`${process.env.PAYTM_STATUS_URL}/${paymentId}`, {
      headers: {
        'x-api-key': process.env.PAYTM_API_KEY,
      }
    });
    return response.data.status;
  }

  async initiatePaytmRefund(data) {
    const response = await axios.post(process.env.PAYTM_REFUND_URL, {
      paymentId: data.paymentId,
      refundAmount: data.refundAmount,
      reason: data.reason,
    }, {
      headers: {
        'x-api-key': process.env.PAYTM_API_KEY,
      }
    });
    return { id: response.data.refundId, status: response.data.status };
  }

  // PhonePe implementations
  async initiatePhonePePayment(data) {
    // Example implementation using PhonePe API
    // Replace with actual PhonePe integration code and credentials
    const response = await axios.post(process.env.PHONEPE_INITIATE_URL, {
      amount: data.amount,
      currency: data.currency,
      customerInfo: data.customerInfo,
      paymentMethod: data.paymentMethod,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.PHONEPE_API_KEY,
      }
    });
    return { id: response.data.transactionId, url: response.data.paymentUrl, token: null };
  }

  async verifyPhonePeStatus(paymentId) {
    const response = await axios.get(`${process.env.PHONEPE_STATUS_URL}/${paymentId}`, {
      headers: {
        'x-api-key': process.env.PHONEPE_API_KEY,
      }
    });
    return response.data.status;
  }

  async initiatePhonePeRefund(data) {
    const response = await axios.post(process.env.PHONEPE_REFUND_URL, {
      paymentId: data.paymentId,
      refundAmount: data.refundAmount,
      reason: data.reason,
    }, {
      headers: {
        'x-api-key': process.env.PHONEPE_API_KEY,
      }
    });
    return { id: response.data.refundId, status: response.data.status };
  }

  // Google Pay implementations
  async initiateGooglePayPayment(data) {
    // Example implementation using Google Pay API
    // Replace with actual Google Pay integration code and credentials
    const response = await axios.post(process.env.GPAY_INITIATE_URL, {
      amount: data.amount,
      currency: data.currency,
      customerInfo: data.customerInfo,
      paymentMethod: data.paymentMethod,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.GPAY_API_KEY,
      }
    });
    return { id: response.data.transactionId, url: response.data.paymentUrl, token: null };
  }

  async verifyGooglePayStatus(paymentId) {
    const response = await axios.get(`${process.env.GPAY_STATUS_URL}/${paymentId}`, {
      headers: {
        'x-api-key': process.env.GPAY_API_KEY,
      }
    });
    return response.data.status;
  }

  async initiateGooglePayRefund(data) {
    const response = await axios.post(process.env.GPAY_REFUND_URL, {
      paymentId: data.paymentId,
      refundAmount: data.refundAmount,
      reason: data.reason,
    }, {
      headers: {
        'x-api-key': process.env.GPAY_API_KEY,
      }
    });
    return { id: response.data.refundId, status: response.data.status };
  }
}

export default new PaymentService();
