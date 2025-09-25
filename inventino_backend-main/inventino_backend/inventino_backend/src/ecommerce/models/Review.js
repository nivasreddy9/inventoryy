import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true,
    trim: true,
    minlength: 10,
    maxlength: 1000
  },
  image: {
    data: Buffer,
    contentType: String
  }
}, {
  timestamps: true
});

reviewSchema.index({ product: 1, user: 1 }, { unique: true });

export default mongoose.model('Review', reviewSchema);
