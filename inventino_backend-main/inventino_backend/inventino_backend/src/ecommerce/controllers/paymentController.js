import PaymentService from '../services/paymentService.js';
import Payment from '../models/payment.js';

class PaymentController {
  static async initiatePayment(data) {
    const { amount, currency, customerInfo, paymentMethod, provider } = data;

    // Validate provider
    const supportedProviders = ['razorpay', 'stripe', 'paytm', 'phonepe', 'googlepay'];
    if (!supportedProviders.includes(provider)) {
      throw new Error('Unsupported payment provider');
    }

    // Create payment record
    const payment = await Payment.create({
      amount,
      currency,
      paymentMethod,
      provider,
      customerInfo,
    });

    // Initiate payment with provider
    const paymentDetails = await PaymentService.initiatePayment(provider, {
      amount,
      currency,
      customerInfo,
      paymentMethod,
    });

    // Update payment with provider's payment ID
    await payment.update({ paymentId: paymentDetails.id });

    return {
      paymentId: payment.id,
      providerPaymentId: paymentDetails.id,
      paymentUrl: paymentDetails.url || null,
      token: paymentDetails.token || null,
    };
  }

  static async verifyPaymentStatus(paymentId) {
    const payment = await Payment.findByPk(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    const status = await PaymentService.verifyPaymentStatus(payment.provider, payment.paymentId);

    // Update local status
    await payment.update({ status });

    return {
      paymentId: payment.id,
      amount: payment.amount,
      currency: payment.currency,
      status,
      paymentMethod: payment.paymentMethod,
      provider: payment.provider,
    };
  }

  static async initiateRefund(data) {
    const { paymentId, refundAmount, reason } = data;

    const payment = await Payment.findByPk(paymentId);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new Error('Refund can only be initiated for completed payments');
    }

    if (refundAmount > payment.amount) {
      throw new Error('Refund amount cannot exceed original payment amount');
    }

    const refundDetails = await PaymentService.initiateRefund(payment.provider, {
      paymentId: payment.paymentId,
      refundAmount,
      reason,
    });

    // Update payment with refund ID
    await payment.update({ refundId: refundDetails.id, status: 'refunded' });

    return {
      refundId: refundDetails.id,
      status: refundDetails.status,
      amount: refundAmount,
    };
  }
}

export default PaymentController;
