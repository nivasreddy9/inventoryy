import mongoose from 'mongoose';

const creditTransactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  transactionId: {
    type: String,
    required: true,
    unique: true
  },
  type: {
    type: String,
    enum: ['credit', 'debit', 'refund', 'withdrawal', 'transfer'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  balanceBefore: {
    type: Number,
    required: true
  },
  balanceAfter: {
    type: Number,
    required: true
  },
  source: {
    type: String,
    enum: [
      'order_refund',
      'return_refund',
      'cancellation_refund',
      'promotional_credit',
      'referral_bonus',
      'loyalty_points',
      'manual_credit',
      'withdrawal',
      'transfer_in',
      'transfer_out',
      'adjustment'
    ],
    required: true
  },
  reference: {
    type: String,
    required: true
  },
  referenceId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true
  },
  description: {
    type: String,
    maxlength: 500
  },
  metadata: {
    orderId: String,
    returnId: String,
    promotionId: String,
    referralUserId: String,
    adjustmentReason: String,
    notes: String
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed', 'cancelled', 'reversed'],
    default: 'pending'
  },
  processedAt: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date,
    default: null
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes for performance
creditTransactionSchema.index({ user: 1 });
creditTransactionSchema.index({ transactionId: 1 });
creditTransactionSchema.index({ reference: 1 });
creditTransactionSchema.index({ createdAt: -1 });
creditTransactionSchema.index({ user: 1, createdAt: -1 });

// Virtual for formatted amount
creditTransactionSchema.virtual('formattedAmount').get(function() {
  const sign = this.type === 'credit' || this.type === 'refund' ? '+' : '-';
  return `${sign}₹${this.amount.toFixed(2)}`;
});

// Pre-save middleware to validate balance
creditTransactionSchema.pre('save', function(next) {
  if (this.type === 'credit' || this.type === 'refund') {
    this.balanceAfter = this.balanceBefore + this.amount;
  } else {
    this.balanceAfter = this.balanceBefore - this.amount;
  }
  next();
});

// Static method to get user balance
creditTransactionSchema.statics.getUserBalance = async function(userId) {
  try {
    const lastTransaction = await this.findOne({ user: userId })
      .sort({ createdAt: -1 })
      .limit(1);
    
    return lastTransaction ? lastTransaction.balanceAfter : 0;
  } catch (error) {
    console.error('Error getting user balance:', error);
    return 0;
  }
};

// Static method to get transaction history
creditTransactionSchema.statics.getTransactionHistory = async function(userId, limit = 50, offset = 0) {
  try {
    return await this.find({ user: userId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .skip(offset)
      .populate('user', 'firstName lastName email');
  } catch (error) {
    console.error('Error getting transaction history:', error);
    return [];
  }
};

// Static method to get monthly summary
creditTransactionSchema.statics.getMonthlySummary = async function(userId, year, month) {
  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const result = await this.aggregate([
      {
        $match: {
          user: userId,
          createdAt: { $gte: startDate, $lte: endDate },
          status: 'completed'
        }
      },
      {
        $group: {
          _id: null,
          totalCredits: {
            $sum: {
              $cond: [
                { $in: ['$type', ['credit', 'refund']] },
                '$amount',
                0
              ]
            }
          },
          totalDebits: {
            $sum: {
              $cond: [
                { $in: ['$type', ['debit', 'withdrawal']] },
                '$amount',
                0
              ]
            }
          },
          transactionCount: { $sum: 1 }
        }
      }
    ]);

    return result.length > 0 ? result[0] : {
      totalCredits: 0,
      totalDebits: 0,
      transactionCount: 0
    };
  } catch (error) {
    console.error('Error getting monthly summary:', error);
    return {
      totalCredits: 0,
      totalDebits: 0,
      transactionCount: 0
    };
  }
};

// Static method to create credit transaction
creditTransactionSchema.statics.createTransaction = async function(userId, type, amount, source, reference, referenceId, description = '', metadata = {}) {
  try {
    const currentBalance = await this.getUserBalance(userId);
    
    const transaction = new this({
      user: userId,
      transactionId: `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      type,
      amount,
      balanceBefore: currentBalance,
      source,
      reference,
      referenceId,
      description,
      metadata
    });

    await transaction.save();
    return transaction;
  } catch (error) {
    console.error('Error creating credit transaction:', error);
    throw error;
  }
};

export default mongoose.model('CreditTransaction', creditTransactionSchema);
