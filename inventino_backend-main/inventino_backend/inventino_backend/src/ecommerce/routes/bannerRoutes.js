import express from 'express';
import Banner from '../models/banner.js';
import {
    validateBannerCreation,
    validateBannerUpdate,
    handleValidationErrors,
    validateObjectId
} from '../middleware/extendedValidation.js';
import authMiddleware, { adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all banners
router.get('/', async (req, res) => {
    try {
        const { category, isActive } = req.query;
        let query = {};

        if (category) {
            query.category = category;
        }

        if (isActive !== undefined) {
            query.isActive = isActive === 'true';
        }

        const banners = await Banner.find(query).sort({ sortOrder: 1 });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get banner by ID
router.get('/:id', validateObjectId(), handleValidationErrors, async (req, res) => {
    try {
        const banner = await Banner.findById(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }
        res.json(banner);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Create new banner (Admin only)
router.post('/', authMiddleware, adminOnly, validateBannerCreation, handleValidationErrors, async (req, res) => {
    try {
        const banner = new Banner(req.body);
        await banner.save();
        res.status(201).json(banner);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Update banner (Admin only)
router.put('/:id', authMiddleware, adminOnly, validateObjectId(), validateBannerUpdate, handleValidationErrors, async (req, res) => {
    try {
        const banner = await Banner.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }
        res.json(banner);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Delete banner (Admin only)
router.delete('/:id', authMiddleware, adminOnly, validateObjectId(), handleValidationErrors, async (req, res) => {
    try {
        const banner = await Banner.findByIdAndDelete(req.params.id);
        if (!banner) {
            return res.status(404).json({ message: 'Banner not found' });
        }
        res.json({ message: 'Banner deleted successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get banners by category
router.get('/category/:category', async (req, res) => {
    try {
        const banners = await Banner.find({
            category: req.params.category,
            isActive: true
        }).sort({ sortOrder: 1 });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

export default router;
