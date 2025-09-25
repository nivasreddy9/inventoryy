import express from 'express';
import mongoose from 'mongoose';
import Address from '../models/Address.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// POST /api/address - Add new address
router.post('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { fullName, phone, pincode, street, city, state, country, isDefault } = req.body;

    const address = new Address({
      user: userId,
      fullName,
      phone,
      pincode,
      street,
      city,
      state,
      country,
      isDefault
    });

    await address.save();

    res.status(201).json({
      success: true,
      message: 'Address added successfully',
      data: address
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to add address',
      error: error.message
    });
  }
});

// GET /api/address - Get all addresses for user
router.get('/', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;

    const addresses = await Address.find({ user: userId }).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      message: 'Addresses retrieved successfully',
      data: addresses
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve addresses',
      error: error.message
    });
  }
});

// GET /api/address/:id - Get single address
router.get('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address ID'
      });
    }

    const address = await Address.findOne({ _id: id, user: userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Address retrieved successfully',
      data: address
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve address',
      error: error.message
    });
  }
});

// PUT /api/address/:id - Update address
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;
    const updates = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address ID'
      });
    }

    // Remove sensitive fields
    delete updates.user;
    delete updates._id;

    const address = await Address.findOneAndUpdate(
      { _id: id, user: userId },
      updates,
      { new: true, runValidators: true }
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Address updated successfully',
      data: address
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update address',
      error: error.message
    });
  }
});

// DELETE /api/address/:id - Delete address
router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address ID'
      });
    }

    const address = await Address.findOneAndDelete({ _id: id, user: userId });

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Address deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete address',
      error: error.message
    });
  }
});

// PUT /api/address/:id/default - Set address as default
router.put('/:id/default', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid address ID'
      });
    }

    // First, unset all default addresses for this user
    await Address.updateMany(
      { user: userId },
      { isDefault: false }
    );

    // Then set the specified address as default
    const address = await Address.findOneAndUpdate(
      { _id: id, user: userId },
      { isDefault: true },
      { new: true }
    );

    if (!address) {
      return res.status(404).json({
        success: false,
        message: 'Address not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Default address updated successfully',
      data: address
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to set default address',
      error: error.message
    });
  }
});

export default router;
