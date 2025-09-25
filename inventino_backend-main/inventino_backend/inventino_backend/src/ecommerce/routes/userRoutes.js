import express from 'express';
import { body } from 'express-validator';
import User from '../models/User.js';
import ReturnRequest from '../models/ReturnRequest.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import authMiddleware, { adminOnly } from '../middleware/authMiddleware.js';
import { sendOTPEmail } from '../utils/emailService.js';
import crypto from 'crypto';
import {
    validateUserRegistration,
    validateUserLogin,
    validateUpdateProfile,
    validateEmail,
    validatePasswordReset,
    validateAddress,
    handleValidationErrors,
    validatePagination,
    validateObjectId
} from '../middleware/extendedValidation.js';

const router = express.Router();

/**
 * @route POST /api/users/register
 * @desc Register a new user account
 * @access Public
 * @param {string} email - User's email address
 * @param {string} password - User's password (min 6 chars, must contain uppercase, lowercase, number, special char)
 * @param {string} firstName - User's first name
 * @param {string} lastName - User's last name
 * @param {string} phone - User's phone number (optional)
 * @returns {object} Success message with user data
 */
router.post('/register', validateUserRegistration, handleValidationErrors, async (req, res) => {
  try {
    const { email, password, firstName, lastName, phone } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({
        success: false,
        message: 'Registration failed',
        errors: [{
          field: 'email',
          message: 'An account with this email already exists',
          value: email
        }]
      });
    }

    // Generate OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

    // Create user with OTP and not verified yet
    const user = new User({
      email,
      password,
      firstName,
      lastName,
      phone,
      otp,
      otpExpires,
      isVerified: false
    });
    await user.save();

    // Send OTP email
    await sendOTPEmail(email, otp);

    res.status(200).json({
      success: true,
      message: 'OTP sent to email. Please verify to complete registration.',
      data: {
        email: user.email
      }
    });
  } catch (error) {
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({
        success: false,
        message: 'Registration failed',
        errors: [{
          field,
          message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
          value: error.keyValue[field]
        }]
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

/**
 * @route POST /api/users/login
 * @desc Authenticate user and send OTP for verification
 * @access Public
 * @param {string} email - User's email address
 * @param {string} password - User's password
 * @returns {object} Success message indicating OTP sent
 */
router.post('/login', validateUserLogin, handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        errors: [{
          field: 'email',
          message: 'No account found with this email address'
        }]
      });
    }

    if (user.isActive === false) {
      return res.status(403).json({
        success: false,
        message: 'Account deactivated. Please contact the administrator.'
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        errors: [{
          field: 'password',
          message: 'Incorrect password'
        }]
      });
    }

    if (!user.isVerified) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        errors: [{
          field: 'email',
          message: 'Please verify your email address before logging in'
        }]
      });
    }

    if (user.otpRequired) {
      // Generate OTP
      const otp = crypto.randomInt(100000, 999999).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes expiry

      user.otp = otp;
      user.otpExpires = otpExpires;
      await user.save();

      // Send OTP email
      await sendOTPEmail(email, otp);

      res.status(200).json({
        success: true,
        message: 'OTP sent to email. Please verify to complete login.',
        data: {
          email: user.email
        }
      });
    } else {
      // Issue JWT token directly
      const token = jwt.sign(
        { id: user._id, email: user.email, role: user.role },
        process.env.JWT_SECRET || 'fallback-secret',
        { expiresIn: '24h' }
      );

      res.json({
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user._id,
            email: user.email,
            firstName: user.firstName,
            lastName: user.lastName,
            isVerified: user.isVerified
          }
        }
      });
    }
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

/**
 * @route POST /api/users/verify-registration-otp
 * @desc Verify OTP for user registration and activate account
 * @access Public
 * @param {string} email - User's email address
 * @param {string} otp - OTP sent to email
 * @returns {object} Success message or error
 */
router.post('/verify-registration-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errors: [{
          field: 'email',
          message: 'No account found with this email address'
        }]
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'User already verified'
      });
    }

    if (user.otp !== otp || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    user.isVerified = true;
    user.otpRequired = true;
    user.otp = null;
    user.otpExpires = null;
    await user.save();

    res.json({
      success: true,
      message: 'User registration verified successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message
    });
  }
});

/**
 * @route POST /api/users/verify-login-otp
 * @desc Verify OTP for user login and issue JWT token
 * @access Public
 * @param {string} email - User's email address
 * @param {string} otp - OTP sent to email
 * @returns {object} JWT token and user data or error
 */
router.post('/verify-login-otp', async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
        errors: [{
          field: 'email',
          message: 'No account found with this email address'
        }]
      });
    }

    if (user.otp !== otp || !user.otpExpires || user.otpExpires < new Date()) {
      return res.status(400).json({
        success: false,
        message: 'Invalid or expired OTP'
      });
    }

    // Clear OTP fields
    user.otp = null;
    user.otpExpires = null;
    user.otpRequired = false;
    await user.save();

    // Issue JWT token
    const token = jwt.sign(
      { id: user._id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          isVerified: user.isVerified
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'OTP verification failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/users/profile
 * @desc Get current user profile information
 * @access Private (authenticated users)
 * @returns {object} User profile data (excluding password and sensitive tokens)
 */
router.get('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findById(userId).select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Profile not found',
                errors: [{
                    field: 'user',
                    message: 'User profile could not be retrieved'
                }]
            });
        }

        res.json({
            success: true,
            message: 'Profile retrieved successfully',
            data: user
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve profile',
            error: error.message
        });
    }
});

/**
 * @route PUT /api/users/profile
 * @desc Update current user profile information
 * @access Private (authenticated users)
 * @param {string} firstName - Updated first name (optional)
 * @param {string} lastName - Updated last name (optional)
 * @param {string} phone - Updated phone number (optional)
 * @returns {object} Updated user profile data
 */
router.put('/profile', authMiddleware, validateUpdateProfile, handleValidationErrors, async (req, res) => {
    try {
        const userId = req.user.id;
        const updates = req.body;

        // Remove sensitive fields from updates
        delete updates.password;
        delete updates.email; // Prevent email updates through profile update

        // Check if email is being updated
        if (updates.email) {
            const existingUser = await User.findOne({ email: updates.email });
            if (existingUser && existingUser._id.toString() !== userId) {
                return res.status(409).json({
                    success: false,
                    message: 'Update failed',
                    errors: [{
                        field: 'email',
                        message: 'This email address is already in use by another account'
                    }]
                });
            }
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updates },
            { new: true, runValidators: true }
        ).select('-password -verificationToken -resetPasswordToken -resetPasswordExpires');

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Update failed',
                errors: [{
                    field: 'user',
                    message: 'User profile could not be updated'
                }]
            });
        }

        res.json({
            success: true,
            message: 'Profile updated successfully',
            data: user
        });
    } catch (error) {
        if (error.code === 11000) {
            const field = Object.keys(error.keyPattern)[0];
            return res.status(409).json({
                success: false,
                message: 'Update failed',
                errors: [{
                    field,
                    message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`,
                    value: error.keyValue[field]
                }]
            });
        }

        res.status(400).json({
            success: false,
            message: 'Update failed',
            error: error.message
        });
    }
});

/**
 * @route DELETE /api/users/profile
 * @desc Delete current user account permanently
 * @access Private (authenticated users)
 * @returns {object} Success message confirming account deletion
 */
router.delete('/profile', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await User.findByIdAndDelete(userId);

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Deletion failed',
                errors: [{
                    field: 'user',
                    message: 'User account could not be found'
                }]
            });
        }

        res.json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to delete account',
            error: error.message
        });
    }
});

/**
 * @route GET /api/users
 * @desc Get paginated list of all users (admin only)
 * @access Private (admin only)
 * @param {number} page - Page number (optional, default 1)
 * @param {number} limit - Number of users per page (optional, default 10)
 * @returns {object} Paginated list of users excluding sensitive fields
 */
router.get('/', authMiddleware, adminOnly, validatePagination, handleValidationErrors, async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const skip = (page - 1) * limit;

        const users = await User.find()
            .select('-password -verificationToken -resetPasswordToken -resetPasswordExpires')
            .skip(skip)
            .limit(parseInt(limit))
            .sort({ createdAt: -1 });

        const total = await User.countDocuments();

        res.json({
            success: true,
            message: 'Users retrieved successfully',
            data: {
                users,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(total / limit),
                    totalUsers: total,
                    hasNext: skip + users.length < total,
                    hasPrev: page > 1
                }
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve users',
            error: error.message
        });
    }
});

/**
 * @route PUT /api/users/password
 * @desc Update current user's password
 * @access Private (authenticated users)
 * @param {string} currentPassword - User's current password
 * @param {string} newPassword - New password (min 6 chars, must contain uppercase, lowercase, number, special char)
 * @returns {object} Success message confirming password update
 */
router.put('/password', authMiddleware, [
    body('currentPassword').notEmpty().withMessage('Current password is required'),
    body('newPassword')
        .isLength({ min: 6, max: 128 })
        .withMessage('Password must be between 6 and 128 characters')
        .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
        .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
], handleValidationErrors, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Password update failed',
                errors: [{
                    field: 'user',
                    message: 'User not found'
                }]
            });
        }

        const isMatch = await user.comparePassword(currentPassword);
        if (!isMatch) {
            return res.status(401).json({
                success: false,
                message: 'Password update failed',
                errors: [{
                    field: 'currentPassword',
                    message: 'Current password is incorrect'
                }]
            });
        }

        user.password = newPassword;
        await user.save();

        res.json({
            success: true,
            message: 'Password updated successfully'
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Failed to update password',
            error: error.message
        });
    }
});

/**
 * @route POST /api/users/logout
 * @desc Logout current user (client-side token removal)
 * @access Private (authenticated users)
 * @returns {object} Success message confirming logout
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);
    if (user) {
      user.otpRequired = true;
      await user.save();
    }
    // For JWT, logout can be handled client-side by deleting the token.
    // Optionally, implement token blacklisting here if needed.
    res.status(200).json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed',
      error: error.message
    });
  }
});

/**
 * @route POST /api/users/returns
 * @desc Create a new return or replacement request
 * @access Private (authenticated users)
 * @param {string} order - Order ID
 * @param {string} type - Type of request (return/replacement/exchange)
 * @param {array} items - Array of items to return
 * @param {object} pickupAddress - Pickup address
 * @param {string} customerNotes - Customer notes
 * @returns {object} Created return request
 */
router.post('/returns', authMiddleware, [
  body('order').isMongoId().withMessage('Valid order ID is required'),
  body('type').isIn(['return', 'replacement', 'exchange']).withMessage('Type must be return, replacement, or exchange'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.product').isMongoId().withMessage('Valid product ID is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.reason').isIn(['defective', 'wrong_item', 'damaged_in_transit', 'not_as_described', 'size_issue', 'color_issue', 'quality_issue', 'changed_mind', 'duplicate_item', 'other']).withMessage('Valid reason is required'),
  body('items.*.expectedAction').isIn(['refund', 'replacement', 'exchange', 'repair']).withMessage('Valid expected action is required'),
  body('pickupAddress.street').notEmpty().withMessage('Street is required'),
  body('pickupAddress.city').notEmpty().withMessage('City is required'),
  body('pickupAddress.state').notEmpty().withMessage('State is required'),
  body('pickupAddress.zipCode').notEmpty().withMessage('Zip code is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { order, type, items, pickupAddress, customerNotes } = req.body;
    const userId = req.user.id;

    const returnRequest = new ReturnRequest({
      user: userId,
      order,
      type,
      items,
      pickupAddress,
      customerNotes
    });

    await returnRequest.save();

    // Populate references
    await returnRequest.populate('user', 'firstName lastName email');
    await returnRequest.populate('order', 'orderNumber totalAmount');
    await returnRequest.populate('items.product', 'name price images');

    res.status(201).json({
      success: true,
      message: 'Return request created successfully',
      data: returnRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to create return request',
      error: error.message
    });
  }
});

/**
 * @route GET /api/users/returns
 * @desc Get user's return requests
 * @access Private (authenticated users)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10)
 * @returns {object} User's return requests
 */
router.get('/returns', authMiddleware, async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const userId = req.user.id;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    const returnRequests = await ReturnRequest.find({ user: userId })
      .populate('order', 'orderNumber totalAmount status')
      .populate('items.product', 'name price images')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await ReturnRequest.countDocuments({ user: userId });
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: 'Return requests retrieved successfully',
      data: {
        returnRequests,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalRequests: total,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve return requests',
      error: error.message
    });
  }
});

/**
 * @route GET /api/users/returns/:id
 * @desc Get specific return request with pickup details
 * @access Private (authenticated users)
 * @param {string} id - Return request ID
 * @returns {object} Return request details including pickup date
 */
router.get('/returns/:id', authMiddleware, validateObjectId(), handleValidationErrors, async (req, res) => {
  try {
    const returnRequest = await ReturnRequest.findOne({
      _id: req.params.id,
      user: req.user.id
    })
    .populate('order', 'orderNumber totalAmount status createdAt')
    .populate('items.product', 'name price images sku')
    .populate('timeline.updatedBy', 'firstName lastName');

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    res.json({
      success: true,
      message: 'Return request retrieved successfully',
      data: {
        ...returnRequest.toObject(),
        pickupDetails: {
          date: returnRequest.pickupDate,
          address: returnRequest.pickupAddress,
          status: returnRequest.status
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve return request',
      error: error.message
    });
  }
});

export default router;
