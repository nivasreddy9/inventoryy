import mongoose from 'mongoose';
import slugify from 'slugify';

const productTypeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Product type name is required'],
    trim: true,
    maxlength: [50, 'Product type name cannot exceed 50 characters']
  },
  slug: {
    type: String,
    unique: true,
    lowercase: true
  },
  description: {
    type: String,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  category: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    required: [true, 'Category is required']
  },
  products: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product'
  }],
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin',
    required: true
  }
}, {
  timestamps: true
});

// Create slug from name before saving
productTypeSchema.pre('save', function(next) {
  if (this.isModified('name')) {
    this.slug = slugify(this.name, { lower: true, strict: true });
  }
  next();
});

// Index for better query performance
productTypeSchema.index({ name: 1 });
productTypeSchema.index({ slug: 1 });
productTypeSchema.index({ category: 1 });

const ProductType = mongoose.model('ProductType', productTypeSchema);

export default ProductType;
