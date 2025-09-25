import mongoose from 'mongoose';

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    index: true
  },
  type: {
    type: String,
    enum: ['email', 'sms', 'push', 'whatsapp'],
    required: true
  },
  message: {
    type: String,
    required: true,
    trim: true
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending'
  },
  isRead: {
    type: Boolean,
    default: false
  },
  // Additional metadata for tracking
  provider: {
    type: String,
    enum: ['nodemailer', 'sendgrid', 'twilio', 'msg91', 'fcm', 'onesignal', 'whatsapp_business'],
    required: true
  },
  providerResponse: {
    type: mongoose.Schema.Types.Mixed, // Store provider response data
    default: null
  },
  errorMessage: {
    type: String,
    default: null
  },
  // Optional fields for different notification types
  subject: {
    type: String,
    trim: true
  },
  recipient: {
    type: String, // email, phone number, or device token
    required: true
  },
  priority: {
    type: String,
    enum: ['low', 'normal', 'high'],
    default: 'normal'
  },
  // For push notifications
  deviceToken: {
    type: String,
    default: null
  },
  // For WhatsApp
  templateId: {
    type: String,
    default: null
  },
  // For SMS/WhatsApp
  countryCode: {
    type: String,
    default: null
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
notificationSchema.index({ userId: 1, createdAt: -1 });
notificationSchema.index({ status: 1, createdAt: -1 });
notificationSchema.index({ type: 1, status: 1 });

// Static method to get unread count for a user
notificationSchema.statics.getUnreadCount = function(userId) {
  return this.countDocuments({ userId, isRead: false });
};

// Instance method to mark as read
notificationSchema.methods.markAsRead = function() {
  this.isRead = true;
  return this.save();
};

// Instance method to update status
notificationSchema.methods.updateStatus = function(status, providerResponse = null, errorMessage = null) {
  this.status = status;
  if (providerResponse) {
    this.providerResponse = providerResponse;
  }
  if (errorMessage) {
    this.errorMessage = errorMessage;
  }
  return this.save();
};

export default mongoose.model('Notification', notificationSchema);
