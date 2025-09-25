import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Offer from '../models/offers.js';
import { sampleOffers } from '../sampleData/sampleOffers.js';

dotenv.config();

const seedOffers = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected to MongoDB');

    // Clear existing offers
    await Offer.deleteMany({});
    console.log('Cleared existing offers');

    // Insert sample offers
    const offers = await Offer.insertMany(sampleOffers);
    console.log(`Seeded ${offers.length} offers successfully`);

    // Display created offers
    console.log('\nCreated Offers:');
    offers.forEach((offer, index) => {
      console.log(`${index + 1}. ${offer.code} - ${offer.description}`);
      console.log(`   Type: ${offer.type}, Value: ${offer.value}${offer.type === 'percentage' ? '%' : '₹'}`);
      console.log(`   Min Order: ₹${offer.minimumOrderAmount}, Valid until: ${offer.endDate.toDateString()}`);
      console.log(`   Usage Limit: ${offer.usageLimit || 'Unlimited'}`);
      console.log('');
    });

    console.log('Offers seeding completed successfully!');
  } catch (error) {
    console.error('Error seeding offers:', error);
  } finally {
    await mongoose.connection.close();
    console.log('Database connection closed');
  }
};

// Run the seeder
seedOffers();
