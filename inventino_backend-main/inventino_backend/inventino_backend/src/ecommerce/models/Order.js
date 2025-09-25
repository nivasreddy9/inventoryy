import mongoose from 'mongoose';

const orderSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  orderNumber: {
    type: String,
    required: true,
    unique: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    }
  }],
  shippingAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'India' }
  },
  paymentMethod: {
    type: String,
    enum: ['credit_card', 'debit_card', 'paypal', 'upi', 'cod'],
    required: true
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  orderStatus: {
    type: String,
    enum: ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'],
    default: 'pending'
  },
  totalAmount: {
    type: Number,
    required: true
  },
  shipmentDetails: {
    awbNumber: { type: String },
    courier: { type: String },
    shipmentStatus: {
      type: String,
      enum: ['pending', 'in transit', 'delivered'],
      default: 'pending'
    },
    shipmentDate: { type: Date },
    expectedDeliveryDate: { type: Date },
    trackingUrl: { type: String }
  },
  notes: String
}, {
  timestamps: true
});

orderSchema.index({ user: 1 });
orderSchema.index({ orderNumber: 1 });

export default mongoose.model('Order', orderSchema);
