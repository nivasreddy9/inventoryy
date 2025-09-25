import express from 'express';
import multer from 'multer';
import Review from '../models/Review.js';
import {
  validateReview,
  validateReviewUpdate,
  handleValidationErrors,
  validateObjectId,
} from '../middleware/extendedValidation.js';
import authMiddleware, { adminOnly } from '../middleware/authMiddleware.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { files: 1 } });

const router = express.Router();

// Get all reviews for a product
router.get('/product/:productId', validateObjectId('productId'), handleValidationErrors, async (req, res) => {
  try {
    const reviews = await Review.find({ product: req.params.productId })
      .populate('user', 'firstName lastName email')
      .sort({ createdAt: -1 });
    res.json(reviews);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get single review by ID
router.get('/:id', validateObjectId(), handleValidationErrors, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id).populate('user', 'firstName lastName email');
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }
    res.json(review);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create review (user or admin)
router.post('/', authMiddleware, upload.single('image'), validateReview, handleValidationErrors, async (req, res) => {
  try {
    const reviewData = {
      ...req.body,
      user: req.user.id,
    };

    if (req.file) {
      reviewData.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    const review = new Review(reviewData);
    await review.save();
    await review.populate('user', 'firstName lastName email');
    res.status(201).json(review);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update review (user or admin)
router.put('/:id', authMiddleware, upload.single('image'), validateObjectId(), validateReviewUpdate, handleValidationErrors, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user is owner or admin
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updateData = { ...req.body, updatedAt: Date.now() };

    if (req.file) {
      updateData.image = {
        data: req.file.buffer,
        contentType: req.file.mimetype,
      };
    }

    const updatedReview = await Review.findByIdAndUpdate(req.params.id, updateData, { new: true }).populate('user', 'firstName lastName email');
    res.json(updatedReview);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete review (user or admin)
router.delete('/:id', authMiddleware, validateObjectId(), handleValidationErrors, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user is owner or admin
    if (review.user.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    await Review.findByIdAndDelete(req.params.id);
    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
