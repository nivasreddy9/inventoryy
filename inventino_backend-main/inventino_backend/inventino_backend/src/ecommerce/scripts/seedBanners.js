import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Banner from '../models/banner.js';
import { bannerData } from '../sampleData/bannerData.js';
import connectEcommerceDB from '../config/database.js';

dotenv.config();

const seedBanners = async () => {
  try {
    console.log('🌱 Seeding banner data...');

    // Connect to database
    await connectEcommerceDB();
    console.log('✅ Database connected');

    // Clear existing banners
    await Banner.deleteMany({});
    console.log('🗑️  Cleared existing banners');

    // Insert new banners
    const banners = await Banner.insertMany(bannerData);
    console.log(`✅ Successfully seeded ${banners.length} banners`);

    // Display seeded banners
    console.log('\n📋 Seeded Banners:');
    banners.forEach((banner, index) => {
      console.log(`${index + 1}. ${banner.title} (${banner.category})`);
    });

    console.log('\n🎉 Banner seeding completed successfully!');
    process.exit(0);

  } catch (error) {
    console.error('❌ Error seeding banners:', error);
    process.exit(1);
  }
};

seedBanners();
