
import express from 'express';
import Offer from '../models/offers.js';
import mongoose from 'mongoose';
import authMiddleware, { adminOnly } from '../middleware/authMiddleware.js';

// Get active offers with optional filters
export const getActiveOffers = async (req, res) => {
  try {
    const filters = {};
    if (req.query.type) filters.type = req.query.type;
    if (req.query.minAmount) filters.minimumOrderAmount = { $lte: Number(req.query.minAmount) };
    if (req.query.maxDiscount) filters.maximumDiscount = { $gte: Number(req.query.maxDiscount) };

    const offers = await Offer.findActive(filters);
    res.status(200).json({ success: true, data: offers });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
// create a new offer(Admin only)

export const createOffer = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Use req.user.id if available, otherwise fallback to req.user._id
    const adminId = req.user.id || req.user._id;

    if (!adminId) {
      return res.status(400).json({ success: false, message: 'Invalid admin authentication - missing ID' });
    }

    const offerData = req.body;
    offerData.createdBy = adminId;

    const newOffer = new Offer(offerData);
    await newOffer.save();

    res.status(201).json({ success: true, data: newOffer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Update an existing offer (Admin only)
export const updateOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({ success: false, message: 'Invalid offer ID' });
    }

    const offer = await Offer.findById(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    Object.assign(offer, req.body);
    offer.updatedBy = req.user.id;
    await offer.save();

    res.status(200).json({ success: true, data: offer });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Delete an offer (Admin only)
export const deleteOffer = async (req, res) => {
  try {
    const offerId = req.params.id;
    if (!mongoose.Types.ObjectId.isValid(offerId)) {
      return res.status(400).json({ success: false, message: 'Invalid offer ID' });
    }

    const offer = await Offer.findByIdAndDelete(offerId);
    if (!offer) {
      return res.status(404).json({ success: false, message: 'Offer not found' });
    }

    res.status(200).json({ success: true, message: 'Offer deleted successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Apply coupon to an order
export const applyCoupon = async (req, res) => {
  try {
    const { code, orderAmount } = req.body;
    const userId = req.user.id;

    if (!code || !orderAmount) {
      return res.status(400).json({ success: false, message: 'Coupon code and order amount are required' });
    }

    const offer = await Offer.validateCoupon(code, orderAmount, userId);

    const discount = offer.calculateDiscount(orderAmount);

    // Here you would update the order with the discount and increment usage
    // For demo, just increment usage
    await offer.applyCoupon(userId, null, discount);

    res.status(200).json({ success: true, data: { offer, discount } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// Remove coupon from an order
export const removeCoupon = async (req, res) => {
  try {
    // Implementation depends on order management system
    // For now, just respond success
    res.status(200).json({ success: true, message: 'Coupon removed successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Express router setup
const router = express.Router();

// Public: Get active offers
router.get('/', getActiveOffers);

// Admin: Create offer
router.post('/', authMiddleware, adminOnly, createOffer);

// Admin: Update offer
router.put('/:id', authMiddleware, adminOnly, updateOffer);

// Admin: Delete offer
router.delete('/:id', authMiddleware, adminOnly, deleteOffer);

// Apply coupon
router.post('/apply-coupon', authMiddleware, applyCoupon);

// Remove coupon
router.post('/remove-coupon', authMiddleware, removeCoupon);


// Export the router at the very end of the file
export default router;

