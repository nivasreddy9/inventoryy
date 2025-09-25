import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const connectEcommerceDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/ecommerce');
    console.log(`E-commerce MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('Error connecting to e-commerce database:', error);
    process.exit(1);
  }
};

export default connectEcommerceDB;
