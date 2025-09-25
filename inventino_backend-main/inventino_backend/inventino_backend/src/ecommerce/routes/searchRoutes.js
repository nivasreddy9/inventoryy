import express from 'express';
import Product from '../models/Product.js';
import Search from '../models/Search.js';
import SearchHistory from '../models/SearchHistory.js';
import { validateSearchQuery, handleValidationErrors } from '../middleware/extendedValidation.js';

const router = express.Router();

// Advanced Search Products
router.get('/', validateSearchQuery, handleValidationErrors, async (req, res) => {
    const { q, category, minPrice, maxPrice, sort, type, userId } = req.query;
    try {
        // Build search criteria
        const searchCriteria = { isActive: true };

        if (q) {
            searchCriteria.$or = [
                { name: { $regex: q, $options: 'i' } },
                { description: { $regex: q, $options: 'i' } }
            ];
        }

        if (category) {
            searchCriteria.category = category;
        }

        if (minPrice || maxPrice) {
            searchCriteria.price = {};
            if (minPrice) searchCriteria.price.$gte = parseFloat(minPrice);
            if (maxPrice) searchCriteria.price.$lte = parseFloat(maxPrice);
        }

        // Build sort options
        let sortOption = {};
        if (sort) {
            switch (sort) {
                case 'price_asc':
                    sortOption = { price: 1 };
                    break;
                case 'price_desc':
                    sortOption = { price: -1 };
                    break;
                case 'newest':
                    sortOption = { createdAt: -1 };
                    break;
                case 'rating':
                    sortOption = { 'ratings.average': -1 };
                    break;
                case 'popularity':
                    sortOption = { 'ratings.count': -1 };
                    break;
                default:
                    sortOption = { _id: 1 };
            }
        }

        // Execute search
        const products = await Product.find(searchCriteria)
            .populate('category', 'name')
            .populate('createdBy', 'name')
            .sort(sortOption)
            .limit(50);

        // Store search in Search model
        if (q) {
            const searchData = {
                query: q,
                type: type || 'product',
                filters: {
                    category: category || null,
                    priceRange: {
                        min: minPrice ? parseFloat(minPrice) : null,
                        max: maxPrice ? parseFloat(maxPrice) : null
                    },
                    isActive: true
                },
                sortBy: sort || 'relevance',
                results: {
                    count: products.length,
                    items: products.map(product => ({
                        itemId: product._id,
                        itemType: 'Product',
                        score: 0
                    }))
                },
                user: userId || null
            };

            await Search.findOrCreate(searchData);
        }

        // Store in search history if user is provided
        if (userId && q) {
            await SearchHistory.create({
                user: userId,
                query: q,
                filters: {
                    category,
                    minPrice,
                    maxPrice,
                    sort
                },
                resultsCount: products.length
            });
        }

        res.json({
            success: true,
            data: products,
            count: products.length,
            query: q,
            filters: {
                category,
                priceRange: { min: minPrice, max: maxPrice },
                sort
            }
        });
    } catch (error) {
        console.error('Search error:', error);
        res.status(500).json({
            success: false,
            message: 'Search failed',
            error: error.message
        });
    }
});

// Get Recommendations
router.get('/recommendations', async (req, res) => {
    try {
        // Get trending products based on search popularity
        const recommendedProducts = await Product.find({ isActive: true })
            .populate('category', 'name')
            .sort({ 'ratings.count': -1, createdAt: -1 })
            .limit(10);

        res.json({
            success: true,
            data: recommendedProducts,
            count: recommendedProducts.length
        });
    } catch (error) {
        console.error('Recommendations error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get recommendations',
            error: error.message
        });
    }
});

// Get popular searches
router.get('/popular', async (req, res) => {
    try {
        const popularSearches = await Search.find({ isPublic: true })
            .sort({ searchCount: -1 })
            .limit(10)
            .select('query searchCount type lastSearched');

        res.json({
            success: true,
            data: popularSearches,
            count: popularSearches.length
        });
    } catch (error) {
        console.error('Popular searches error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get popular searches',
            error: error.message
        });
    }
});

// Get user's search history
router.get('/history/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 20 } = req.query;

        const searchHistory = await SearchHistory.find({ user: userId })
            .sort({ timestamp: -1 })
            .limit(parseInt(limit))
            .populate('user', 'name email');

        res.json({
            success: true,
            data: searchHistory,
            count: searchHistory.length
        });
    } catch (error) {
        console.error('Search history error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to get search history',
            error: error.message
        });
    }
});

// Save a search query
router.post('/save', async (req, res) => {
    try {
        const { query, type, filters, userId, isPublic } = req.body;

        const searchData = {
            query,
            type: type || 'product',
            filters,
            user: userId,
            isPublic: isPublic || false
        };

        const savedSearch = await Search.create(searchData);

        res.status(201).json({
            success: true,
            message: 'Search saved successfully',
            data: savedSearch
        });
    } catch (error) {
        console.error('Save search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to save search',
            error: error.message
        });
    }
});

// Delete saved search
router.delete('/saved/:searchId', async (req, res) => {
    try {
        const { searchId } = req.params;
        const deletedSearch = await Search.findByIdAndDelete(searchId);

        if (!deletedSearch) {
            return res.status(404).json({
                success: false,
                message: 'Saved search not found'
            });
        }

        res.json({
            success: true,
            message: 'Saved search deleted successfully'
        });
    } catch (error) {
        console.error('Delete saved search error:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete saved search',
            error: error.message
        });
    }
});

export default router;
