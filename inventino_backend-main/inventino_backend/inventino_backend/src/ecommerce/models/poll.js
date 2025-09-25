import mongoose from 'mongoose';

const pollLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  pollType: {
    type: String,
    enum: ['orders', 'notifications', 'stats'],
    required: true
  },
  lastChecked: {
    type: Date,
    required: true
  },
  polledAt: {
    type: Date,
    default: Date.now,
    index: true
  },
  resultCount: {
    type: Number,
    default: 0
  },
  userAgent: {
    type: String
  },
  ipAddress: {
    type: String
  },
  responseTime: {
    type: Number, // in milliseconds
    index: true
  },
  status: {
    type: String,
    enum: ['success', 'error', 'rate_limited'],
    default: 'success'
  },
  errorMessage: {
    type: String
  },
  metadata: {
    markAsSeen: {
      type: Boolean,
      default: false
    },
    notificationsMarked: {
      type: Number,
      default: 0
    },
    ordersUpdated: {
      type: Number,
      default: 0
    }
  }
}, {
  timestamps: true
});

// Indexes for performance
pollLogSchema.index({ userId: 1, polledAt: -1 });
pollLogSchema.index({ pollType: 1, polledAt: -1 });
pollLogSchema.index({ status: 1, polledAt: -1 });

// Virtual for isRecent (within last 5 minutes)
pollLogSchema.virtual('isRecent').get(function() {
  const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
  return this.polledAt > fiveMinutesAgo;
});

// Method to log successful poll
pollLogSchema.methods.logSuccess = function(resultCount, responseTime, metadata = {}) {
  this.resultCount = resultCount;
  this.responseTime = responseTime;
  this.status = 'success';
  this.metadata = { ...this.metadata, ...metadata };
  return this.save();
};

// Method to log error
pollLogSchema.methods.logError = function(errorMessage, responseTime) {
  this.status = 'error';
  this.errorMessage = errorMessage;
  this.responseTime = responseTime;
  return this.save();
};

// Method to log rate limit
pollLogSchema.methods.logRateLimit = function(responseTime) {
  this.status = 'rate_limited';
  this.responseTime = responseTime;
  return this.save();
};

// Static method to get polling statistics
pollLogSchema.statics.getPollingStats = function(userId, hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);

  return this.aggregate([
    {
      $match: {
        userId: mongoose.Types.ObjectId(userId),
        polledAt: { $gte: since }
      }
    },
    {
      $group: {
        _id: '$pollType',
        totalPolls: { $sum: 1 },
        avgResponseTime: { $avg: '$responseTime' },
        totalResults: { $sum: '$resultCount' },
        errorCount: {
          $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] }
        },
        rateLimitCount: {
          $sum: { $cond: [{ $eq: ['$status', 'rate_limited'] }, 1, 0] }
        }
      }
    }
  ]);
};

// Static method to clean old logs (older than 30 days)
pollLogSchema.statics.cleanOldLogs = function() {
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return this.deleteMany({ polledAt: { $lt: thirtyDaysAgo } });
};

const Polling = mongoose.model('Polling', pollLogSchema, 'polling');

export default Polling;
