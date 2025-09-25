import mongoose from 'mongoose';

const cartSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', unique: true },
  items: [{
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    quantity: { type: Number, default: 1 },
    price: Number,
    addedAt: { type: Date, default: Date.now }
  }],
  totalAmount: { type: Number, default: 0 },
  lastUpdated: { type: Date, default: Date.now }
}, {
  timestamps: true
});

// Pre-save hook to calculate totalAmount
cartSchema.pre('save', function(next) {
  this.totalAmount = this.items.reduce((total, item) => total + item.price * item.quantity, 0);
  this.lastUpdated = new Date();
  next();
});

export default mongoose.model('Cart', cartSchema);
