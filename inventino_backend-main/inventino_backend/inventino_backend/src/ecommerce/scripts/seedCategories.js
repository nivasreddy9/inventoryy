import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Category from '../models/Category.js';
import categories from '../sampleData/categoryData.js';

dotenv.config();

const seedCategories = async () => {
  try {
    console.log('🌱 Seeding categories...');

    // Create a temporary admin ID for seeding
    const tempAdminId = new mongoose.Types.ObjectId();

    // Update categories with admin ID
    const categoriesWithAdmin = categories.map(cat => ({
      ...cat,
      createdBy: tempAdminId
    }));

    // Clear existing categories
    await Category.deleteMany({});
    console.log('🗑️  Cleared existing categories');

    // Insert new categories
    const createdCategories = await Category.insertMany(categoriesWithAdmin);
    console.log(`✅ Created ${createdCategories.length} categories:`);

    createdCategories.forEach(cat => {
      console.log(`  - ${cat.name} (ID: ${cat._id})`);
    });

  } catch (error) {
    console.error('❌ Error seeding categories:', error);
  }
};

export default seedCategories;

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce')
    .then(async () => {
      console.log('🔄 Connected to database');
      await seedCategories();
      console.log('🎉 Seeding completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('❌ Database connection failed:', error);
      process.exit(1);
    });
}
