import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Pincode from '../models/pincode.js';
import { samplePincodes } from '../sampleData/pincodeData.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

const seedPincodes = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing pincodes
    await Pincode.deleteMany({});
    console.log('Cleared existing pincodes');

    // Insert sample pincodes
    await Pincode.insertMany(samplePincodes);
    console.log('Sample pincodes inserted successfully');

    process.exit(0);
  } catch (error) {
    console.error('Error seeding pincodes:', error);
    process.exit(1);
  }
};

seedPincodes();
