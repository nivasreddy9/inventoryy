import mongoose from 'mongoose';

const searchSchema = new mongoose.Schema({
  query: {
    type: String,
    required: true,
    trim: true,
    maxlength: [100, 'Search query cannot exceed 100 characters']
  },
  type: {
    type: String,
    enum: ['product', 'category', 'user', 'general'],
    default: 'general'
  },
  filters: {
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    },
    priceRange: {
      min: {
        type: Number,
        min: 0
      },
      max: {
        type: Number,
        min: 0
      }
    },
    rating: {
      type: Number,
      min: 1,
      max: 5
    },
    inStock: {
      type: Boolean
    },
    isActive: {
      type: Boolean,
      default: true
    },
    tags: [{
      type: String,
      trim: true
    }],
    brand: {
      type: String,
      trim: true
    }
  },
  sortBy: {
    type: String,
    enum: ['relevance', 'price_asc', 'price_desc', 'newest', 'rating', 'popularity'],
    default: 'relevance'
  },
  results: {
    count: {
      type: Number,
      default: 0
    },
    items: [{
      itemId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
      },
      itemType: {
        type: String,
        enum: ['Product', 'Category', 'User'],
        required: true
      },
      score: {
        type: Number,
        default: 0
      }
    }],
    facets: {
      categories: [{
        _id: mongoose.Schema.Types.ObjectId,
        name: String,
        count: Number
      }],
      priceRanges: [{
        range: String,
        count: Number
      }],
      brands: [{
        name: String,
        count: Number
      }]
    }
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  searchCount: {
    type: Number,
    default: 1
  },
  lastSearched: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Indexes for better search performance
searchSchema.index({ query: 1, type: 1 });
searchSchema.index({ 'filters.category': 1 });
searchSchema.index({ user: 1, createdAt: -1 });
searchSchema.index({ isPublic: 1, searchCount: -1 });

// Pre-save middleware to update lastSearched
searchSchema.pre('save', function(next) {
  this.lastSearched = new Date();
  next();
});

// Static method to find or create search
searchSchema.statics.findOrCreate = async function(searchData) {
  const { query, type, user } = searchData;

  let search = await this.findOne({ query, type, user });

  if (search) {
    search.searchCount += 1;
    search.lastSearched = new Date();
    await search.save();
    return search;
  }

  return this.create(searchData);
};

// Method to add search result
searchSchema.methods.addResult = function(itemId, itemType, score = 0) {
  this.results.items.push({ itemId, itemType, score });
  this.results.count = this.results.items.length;
};

// Method to clear results
searchSchema.methods.clearResults = function() {
  this.results.items = [];
  this.results.count = 0;
};

const Search = mongoose.model('Search', searchSchema);

export default Search;
