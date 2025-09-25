import mongoose from 'mongoose';

const searchHistorySchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  query: String,
  filters: Object,
  resultsCount: Number,
  clickedProducts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],
  timestamp: { type: Date, default: Date.now },
  location: String,
  device: String
}, {
  timestamps: true
});

export default mongoose.model('SearchHistory', searchHistorySchema);
