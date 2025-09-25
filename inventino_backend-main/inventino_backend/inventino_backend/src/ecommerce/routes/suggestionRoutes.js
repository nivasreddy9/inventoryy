import express from 'express';
import authMiddleware from '../middleware/authMiddleware.js';
import User from '../models/User.js';
import Product from '../models/Product.js';

const router = express.Router();

// Get product suggestions for the logged-in user
router.get('/', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;

        // Get user's wishlist and search history
        const user = await User.findById(userId).populate('wishlist');
        const searchHistory = await mongoose.model('SearchHistory').find({ user: userId }).sort({ timestamp: -1 }).limit(10);

        let suggestedProducts = [];

        // 1. Add products from wishlist
        if (user.wishlist.length > 0) {
            suggestedProducts.push(...user.wishlist);
        }

        // 2. Add products from search history
        if (searchHistory.length > 0) {
            const clickedProductIds = searchHistory.flatMap(h => h.clickedProducts);
            if (clickedProductIds.length > 0) {
                const products = await Product.find({ _id: { $in: clickedProductIds } });
                suggestedProducts.push(...products);
            }
        }

        // 3. Add some random products as a fallback
        if (suggestedProducts.length < 10) {
            const randomProducts = await Product.aggregate([{ $sample: { size: 10 - suggestedProducts.length } }]);
            suggestedProducts.push(...randomProducts);
        }

        // Remove duplicates
        suggestedProducts = suggestedProducts.filter((p, i, a) => a.findIndex(t => (t._id.toString() === p._id.toString())) === i);

        res.json({
            success: true,
            data: suggestedProducts
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
