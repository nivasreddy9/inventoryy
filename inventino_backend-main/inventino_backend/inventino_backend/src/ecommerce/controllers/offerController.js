import express from 'express';
import { body, param, query } from 'express-validator';
import {
  getActiveOffers,
  createOffer,
  updateOffer,
  deleteOffer,
  applyCoupon,
  removeCoupon
} from '../controllers/offerController.js';
import { authMiddleware as authenticateToken, adminOnly as requireAdmin } from '../middleware/authMiddleware.js';

const router = express.Router();

// Validation rules
const offerValidation = [
  body('code')
    .isLength({ min: 3, max: 20 })
    .withMessage('Code must be 3-20 characters')
    .isAlphanumeric()
    .withMessage('Code must contain only letters and numbers')
    .toUpperCase(),
  body('type')
    .isIn(['percentage', 'fixed'])
    .withMessage('Type must be percentage or fixed'),
  body('value')
    .isNumeric()
    .withMessage('Value must be a number')
    .custom((value, { req }) => {
      if (req.body.type === 'percentage' && value > 100) {
        throw new Error('Percentage cannot exceed 100');
      }
      if (req.body.type === 'fixed' && value <= 0) {
        throw new Error('Fixed amount must be positive');
      }
      return true;
    }),
  body('description')
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be 10-500 characters'),
  body('startDate')
    .isISO8601()
    .withMessage('Start date must be a valid date'),
  body('endDate')
    .isISO8601()
    .withMessage('End date must be a valid date')
    .custom((endDate, { req }) => {
      if (new Date(endDate) <= new Date(req.body.startDate)) {
        throw new Error('End date must be after start date');
      }
      return true;
    }),
  body('minimumOrderAmount')
    .isNumeric()
    .withMessage('Minimum order amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Minimum order amount cannot be negative'),
  body('maximumDiscount')
    .optional()
    .isNumeric()
    .withMessage('Maximum discount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Maximum discount cannot be negative'),
  body('usageLimit')
    .optional()
    .isNumeric()
    .withMessage('Usage limit must be a number')
    .isInt({ min: 1 })
    .withMessage('Usage limit must be at least 1'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be true or false'),
  body('userSpecific')
    .optional()
    .isBoolean()
    .withMessage('userSpecific must be true or false')
];

const applyCouponValidation = [
  body('code')
    .notEmpty()
    .withMessage('Coupon code is required')
    .isLength({ min: 3, max: 20 })
    .withMessage('Invalid coupon code format'),
  body('orderAmount')
    .isNumeric()
    .withMessage('Order amount must be a number')
    .isFloat({ min: 0 })
    .withMessage('Order amount cannot be negative')
];

// Public routes
router.get('/active', [
  query('type').optional().isIn(['percentage', 'fixed']).withMessage('Invalid type'),
  query('minAmount').optional().isNumeric().withMessage('Invalid minimum amount'),
  query('maxDiscount').optional().isNumeric().withMessage('Invalid maximum discount')
], getActiveOffers);

// Protected routes (require authentication)
router.post('/apply', authenticateToken, applyCouponValidation, applyCoupon);
router.post('/remove', authenticateToken, removeCoupon);

// Admin only routes
router.post('/', authenticateToken, requireAdmin, offerValidation, createOffer);
router.put('/:id', [
  param('id').isMongoId().withMessage('Invalid offer ID'),
  ...offerValidation
], authenticateToken, requireAdmin, updateOffer);
router.delete('/:id', [
  param('id').isMongoId().withMessage('Invalid offer ID')
], authenticateToken, requireAdmin, deleteOffer);

export default router;





