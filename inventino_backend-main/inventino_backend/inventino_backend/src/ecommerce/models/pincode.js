import mongoose from 'mongoose';

const pincodeSchema = new mongoose.Schema({
  pincode: {
    type: String,
    required: true,
    unique: true,
    match: [/^\d{6}$/, 'Pincode must be a 6-digit number'],
  },
  isServiceable: {
    type: Boolean,
    required: true,
    default: false,
  },
  estimatedDeliveryDays: {
    type: Number,
    required: true,
    min: [1, 'Estimated delivery days must be a positive integer'],
  },
  region: {
    type: String,
  },
  state: {
    type: String,
  },
  city: {
    type: String,
  },
}, { timestamps: true });

const Pincode = mongoose.model('Pincode', pincodeSchema);

export default Pincode;
