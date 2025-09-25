import mongoose from 'mongoose';

const offerSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Offer code is required'],
    unique: true,
    uppercase: true,
    trim: true,
    minlength: [3, 'Offer code must be at least 3 characters'],
    maxlength: [20, 'Offer code cannot exceed 20 characters']
  },

  type: {
    type: String,
    required: [true, 'Offer type is required'],
    enum: {
      values: ['percentage', 'fixed'],
      message: 'Type must be either percentage or fixed'
    }
  },

  value: {
    type: Number,
    required: [true, 'Offer value is required'],
    min: [0, 'Offer value cannot be negative'],
    validate: {
      validator: function(value) {
        if (this.type === 'percentage') {
          return value <= 100;
        }
        return value > 0;
      },
      message: 'Percentage cannot exceed 100% or fixed amount must be positive'
    }
  },

  description: {
    type: String,
    required: [true, 'Offer description is required'],
    trim: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },

  startDate: {
    type: Date,
    required: [true, 'Start date is required'],
    default: Date.now
  },

  endDate: {
    type: Date,
    required: [true, 'End date is required'],
    validate: {
      validator: function(value) {
        return value > this.startDate;
      },
      message: 'End date must be after start date'
    }
  },

  minimumOrderAmount: {
    type: Number,
    required: [true, 'Minimum order amount is required'],
    min: [0, 'Minimum order amount cannot be negative'],
    default: 0
  },

  maximumDiscount: {
    type: Number,
    min: [0, 'Maximum discount cannot be negative'],
    validate: {
      validator: function(value) {
        if (this.type === 'percentage') {
          return !value || value > 0;
        }
        return true;
      },
      message: 'Maximum discount must be positive for percentage offers'
    }
  },

  usageLimit: {
    type: Number,
    min: [1, 'Usage limit must be at least 1'],
    default: null // null means unlimited
  },

  timesUsed: {
    type: Number,
    default: 0,
    min: [0, 'Times used cannot be negative']
  },

  isActive: {
    type: Boolean,
    default: true
  },

  // For user-specific offers
  userSpecific: {
    type: Boolean,
    default: false
  },

  allowedUsers: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],

  // For category/product specific offers
  applicableCategories: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category'
  }],

  applicableProducts: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],

  // Usage tracking
  usageHistory: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    discountApplied: {
      type: Number,
      required: true,
      min: [0, 'Discount applied cannot be negative']
    },
    appliedAt: {
      type: Date,
      default: Date.now
    }
  }],

  // Metadata
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  },

  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }

}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Indexes for better performance
offerSchema.index({ code: 1 }, { unique: true });
offerSchema.index({ isActive: 1, endDate: 1 });
offerSchema.index({ type: 1 });
offerSchema.index({ startDate: 1, endDate: 1 });

// Virtual for checking if offer is expired
offerSchema.virtual('isExpired').get(function() {
  return new Date() > this.endDate;
});

// Virtual for checking if offer is valid (active and not expired)
offerSchema.virtual('isValid').get(function() {
  return this.isActive && !this.isExpired && new Date() >= this.startDate;
});

// Virtual for remaining uses
offerSchema.virtual('remainingUses').get(function() {
  if (!this.usageLimit) return null; // unlimited
  return Math.max(0, this.usageLimit - this.timesUsed);
});

// Pre-save middleware to ensure endDate is after startDate
offerSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  }
  next();
});

// Static method to find active offers
offerSchema.statics.findActive = function(filters = {}) {
  const query = {
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  };

  if (filters.type) query.type = filters.type;
  if (filters.minimumOrderAmount) query.minimumOrderAmount = { $lte: filters.minimumOrderAmount };
  if (filters.maximumDiscount) query.maximumDiscount = { $gte: filters.maximumDiscount };

  return this.find(query).sort({ createdAt: -1 });
};

// Static method to validate coupon
offerSchema.statics.validateCoupon = async function(code, orderAmount, userId = null) {
  const offer = await this.findOne({
    code: code.toUpperCase(),
    isActive: true,
    startDate: { $lte: new Date() },
    endDate: { $gte: new Date() }
  });

  if (!offer) {
    throw new Error('Invalid or expired coupon code');
  }

  // Check minimum order amount
  if (orderAmount < offer.minimumOrderAmount) {
    throw new Error(`Minimum order amount of ₹${offer.minimumOrderAmount} required`);
  }

  // Check usage limit
  if (offer.usageLimit && offer.timesUsed >= offer.usageLimit) {
    throw new Error('Coupon usage limit exceeded');
  }

  // Check user-specific restrictions
  if (offer.userSpecific && userId) {
    if (!offer.allowedUsers.includes(userId)) {
      throw new Error('This coupon is not available for your account');
    }
  }

  return offer;
};

// Method to calculate discount
offerSchema.methods.calculateDiscount = function(orderAmount) {
  let discount = 0;

  if (this.type === 'percentage') {
    discount = (orderAmount * this.value) / 100;
  } else if (this.type === 'fixed') {
    discount = this.value;
  }

  // Apply maximum discount cap if set
  if (this.maximumDiscount && discount > this.maximumDiscount) {
    discount = this.maximumDiscount;
  }

  // Ensure discount doesn't exceed order amount
  return Math.min(discount, orderAmount);
};

  // Method to apply coupon (increment usage)
  offerSchema.methods.applyCoupon = async function(userId, orderId, discountApplied) {
    this.timesUsed += 1;
    this.usageHistory.push({
      userId,
      orderId: orderId || null,
      discountApplied,
      appliedAt: new Date()
    });

    await this.save();
    return this;
  };

const Offer = mongoose.model('Offer', offerSchema);

export default Offer;
