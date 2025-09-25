import mongoose from 'mongoose';

const returnRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  order: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true
  },
  returnNumber: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['return', 'replacement', 'exchange'],
    required: true
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
    reason: {
      type: String,
      required: true,
      enum: [
        'defective',
        'wrong_item',
        'damaged_in_transit',
        'not_as_described',
        'size_issue',
        'color_issue',
        'quality_issue',
        'changed_mind',
        'duplicate_item',
        'other'
      ]
    },
    detailedReason: {
      type: String,
      maxlength: 500
    },
    images: [{
      type: String
    }],
    expectedAction: {
      type: String,
      enum: ['refund', 'replacement', 'exchange', 'repair'],
      required: true
    }
  }],
  status: {
    type: String,
    enum: [
      'pending',
      'approved',
      'processing',
      'shipped',
      'received',
      'inspected',
      'completed',
      'rejected',
      'cancelled'
    ],
    default: 'pending'
  },
  pickupAddress: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, default: 'India' },
    landmark: String,
    phone: String
  },
  pickupDate: {
    type: Date,
    default: function() {
      // Set pickup date to 2 days from now by default
      const date = new Date();
      date.setDate(date.getDate() + 2);
      return date;
    }
  },
  refundDetails: {
    method: {
      type: String,
      enum: ['original_payment', 'bank_transfer', 'wallet', 'store_credit'],
      default: 'original_payment'
    },
    bankDetails: {
      accountNumber: String,
      ifscCode: String,
      accountHolderName: String,
      bankName: String
    },
    amount: {
      type: Number,
      default: 0
    },
    processedAt: Date,
    transactionId: String
  },
  replacementDetails: {
    newProduct: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    newSize: String,
    newColor: String,
    expectedDelivery: Date,
    trackingNumber: String
  },
  inspectionNotes: {
    type: String,
    maxlength: 1000
  },
  rejectionReason: {
    type: String,
    maxlength: 500
  },
  customerNotes: {
    type: String,
    maxlength: 500
  },
  timeline: [{
    status: String,
    timestamp: { type: Date, default: Date.now },
    notes: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
returnRequestSchema.index({ user: 1 });
returnRequestSchema.index({ order: 1 });
returnRequestSchema.index({ returnNumber: 1 });
returnRequestSchema.index({ status: 1 });
returnRequestSchema.index({ createdAt: -1 });

// Pre-save middleware to generate return number
returnRequestSchema.pre('save', async function(next) {
  if (this.isNew) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.returnNumber = `RET-${timestamp}-${random}`;
    
    // Add initial timeline entry
    this.timeline.push({
      status: this.status,
      timestamp: new Date(),
      notes: 'Return request created'
    });
  }
  next();
});

// Methods
returnRequestSchema.methods.updateStatus = function(status, notes, updatedBy) {
  this.status = status;
  this.timeline.push({
    status,
    timestamp: new Date(),
    notes,
    updatedBy
  });
  return this.save();
};

returnRequestSchema.methods.calculateRefundAmount = function() {
  let totalAmount = 0;
  this.items.forEach(item => {
    // Add logic to calculate refund amount based on product price
    // This would typically fetch product price from database
    totalAmount += item.quantity * 100; // Placeholder
  });
  return totalAmount;
};

returnRequestSchema.methods.addTimelineEntry = function(status, notes, updatedBy) {
  this.timeline.push({
    status,
    timestamp: new Date(),
    notes,
    updatedBy
  });
  return this.save();
};

export default mongoose.model('ReturnRequest', returnRequestSchema);
