import express from 'express';
import Pincode from '../models/pincode.js';
import { authMiddleware, adminOnly } from '../middleware/authMiddleware.js';
import { validatePincodeCreation, validatePincodeUpdate, handleValidationErrors } from '../middleware/extendedValidation.js';

const router = express.Router();

// Check serviceability for a pincode
router.get('/:pincode/serviceability', async (req, res) => {
  try {
    const { pincode } = req.params;

    // Validate pincode format
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pincode format. Must be a 6-digit number.'
      });
    }

    const pincodeData = await Pincode.findOne({ pincode });

    if (!pincodeData) {
      return res.json({
        success: false,
        message: 'Pincode not found in our service area',
        isServiceable: false,
        pincode: pincode
      });
    }

    res.json({
      success: true,
      message: pincodeData.isServiceable ? 'Delivery available for this pincode' : 'Delivery not available for this pincode',
      isServiceable: pincodeData.isServiceable,
      pincode: pincodeData.pincode,
      region: pincodeData.region,
      state: pincodeData.state,
      city: pincodeData.city
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get delivery time estimate for a pincode
router.get('/:pincode/delivery-time', async (req, res) => {
  try {
    const { pincode } = req.params;

    // Validate pincode format
    if (!/^\d{6}$/.test(pincode)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid pincode format. Must be a 6-digit number.'
      });
    }

    const pincodeData = await Pincode.findOne({ pincode });

    if (!pincodeData) {
      return res.status(404).json({
        success: false,
        message: 'Pincode not found in our service area',
        pincode: pincode
      });
    }

    if (!pincodeData.isServiceable) {
      return res.status(400).json({
        success: false,
        message: 'Delivery not available for this pincode',
        isServiceable: false,
        pincode: pincode
      });
    }

    res.json({
      success: true,
      message: 'Delivery time estimate retrieved successfully',
      pincode: pincodeData.pincode,
      estimatedDeliveryDays: pincodeData.estimatedDeliveryDays,
      region: pincodeData.region,
      state: pincodeData.state,
      city: pincodeData.city
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Get all pincodes (Admin only)
router.get('/', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { page = 1, limit = 50, serviceable, state, city } = req.query;

    // Build filter object
    const filter = {};
    if (serviceable !== undefined) {
      filter.isServiceable = serviceable === 'true';
    }
    if (state) {
      filter.state = { $regex: state, $options: 'i' };
    }
    if (city) {
      filter.city = { $regex: city, $options: 'i' };
    }

    const pincodes = await Pincode.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .select('-__v');

    const total = await Pincode.countDocuments(filter);

    res.json({
      success: true,
      message: 'Pincodes retrieved successfully',
      pincodes,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(total / limit),
        totalPincodes: total,
        hasNextPage: page * limit < total,
        hasPrevPage: page > 1
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Create new pincode (Admin only)
router.post('/', authMiddleware, adminOnly, validatePincodeCreation, handleValidationErrors, async (req, res) => {
  try {
    const { pincode, isServiceable, estimatedDeliveryDays, region, state, city } = req.body;

    // Check if pincode already exists
    const existingPincode = await Pincode.findOne({ pincode });
    if (existingPincode) {
      return res.status(400).json({
        success: false,
        message: 'Pincode already exists'
      });
    }

    const newPincode = new Pincode({
      pincode,
      isServiceable,
      estimatedDeliveryDays,
      region,
      state,
      city
    });

    await newPincode.save();

    res.status(201).json({
      success: true,
      message: 'Pincode created successfully',
      pincode: newPincode
    });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Pincode already exists'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Update pincode (Admin only)
router.put('/:pincode', authMiddleware, adminOnly, validatePincodeUpdate, handleValidationErrors, async (req, res) => {
  try {
    const { pincode } = req.params;
    const updateData = req.body;

    const updatedPincode = await Pincode.findOneAndUpdate(
      { pincode },
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedPincode) {
      return res.status(404).json({
        success: false,
        message: 'Pincode not found'
      });
    }

    res.json({
      success: true,
      message: 'Pincode updated successfully',
      pincode: updatedPincode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Delete pincode (Admin only)
router.delete('/:pincode', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { pincode } = req.params;

    const deletedPincode = await Pincode.findOneAndDelete({ pincode });

    if (!deletedPincode) {
      return res.status(404).json({
        success: false,
        message: 'Pincode not found'
      });
    }

    res.json({
      success: true,
      message: 'Pincode deleted successfully',
      pincode: deletedPincode
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

// Bulk create pincodes (Admin only)
router.post('/bulk', authMiddleware, adminOnly, async (req, res) => {
  try {
    const { pincodes } = req.body;

    if (!Array.isArray(pincodes) || pincodes.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Pincodes array is required and cannot be empty'
      });
    }

    const results = {
      created: [],
      errors: [],
      duplicates: []
    };

    for (const pincodeData of pincodes) {
      try {
        // Validate pincode format
        if (!/^\d{6}$/.test(pincodeData.pincode)) {
          results.errors.push({
            pincode: pincodeData.pincode,
            error: 'Invalid pincode format. Must be a 6-digit number.'
          });
          continue;
        }

        // Check if pincode already exists
        const existing = await Pincode.findOne({ pincode: pincodeData.pincode });
        if (existing) {
          results.duplicates.push(pincodeData.pincode);
          continue;
        }

        // Create new pincode
        const newPincode = new Pincode(pincodeData);
        await newPincode.save();
        results.created.push(newPincode);
      } catch (error) {
        results.errors.push({
          pincode: pincodeData.pincode,
          error: error.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Bulk operation completed',
      results: {
        createdCount: results.created.length,
        errorCount: results.errors.length,
        duplicateCount: results.duplicates.length,
        created: results.created,
        errors: results.errors,
        duplicates: results.duplicates
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
});

export default router;
