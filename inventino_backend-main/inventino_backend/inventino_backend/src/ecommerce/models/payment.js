import mongoose from 'mongoose';

const paymentSchema = new mongoose.Schema({
  amount: {
    type: Number,
    required: true,
  },
  currency: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending',
    required: true,
  },
  paymentMethod: {
    type: String,
    required: true,
  },
  provider: {
    type: String,
    enum: ['razorpay', 'stripe', 'paytm', 'phonepe', 'googlepay'],
    required: true,
  },
  customerInfo: {
    type: Object,
    required: true,
  },
  paymentId: {
    type: String,
  },
  refundId: {
    type: String,
  },
}, {
  timestamps: true,
});

const Payment = mongoose.model('Payment', paymentSchema);

export default Payment;
