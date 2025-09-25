import mongoose from 'mongoose';

const bannerSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 1000
  },
  imageUrl: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+\.(jpg|jpeg|png|gif|webp)$/i.test(v);
      },
      message: 'Image URL must be a valid URL ending with jpg, jpeg, png, gif, or webp'
    }
  },
  category: {
    type: String,
    required: true,
    enum: ['accessories', 'clothing', 'electronics', 'home', 'sports', 'books', 'beauty', 'toys', 'general'],
    default: 'general'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  sortOrder: {
    type: Number,
    default: 0,
    min: 0
  },
  linkUrl: {
    type: String,
    required: true,
    validate: {
      validator: function(v) {
        return /^https?:\/\/.+/.test(v) || /^\/.+/.test(v);
      },
      message: 'Link URL must be a valid URL or relative path'
    }
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  endDate: {
    type: Date,
    default: () => new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // 1 year from now
  }
}, {
  timestamps: true
});

// Index for efficient queries
bannerSchema.index({ category: 1, isActive: 1, sortOrder: 1 });
bannerSchema.index({ isActive: 1, startDate: 1, endDate: 1 });

// Virtual for checking if banner is currently active based on dates
bannerSchema.virtual('isCurrentlyActive').get(function() {
  const now = new Date();
  return this.isActive && now >= this.startDate && now <= this.endDate;
});

// Ensure virtual fields are serialized
bannerSchema.set('toJSON', { virtuals: true });
bannerSchema.set('toObject', { virtuals: true });

export default mongoose.model('Banner', bannerSchema);
