import express from 'express';
import { param, query } from 'express-validator';
import { pollOrders, pollNotifications, getPollingStats } from '../controllers/pollController.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { pollingRateLimit } from '../middleware/rateLimiter.js';
import { handleValidationErrors } from '../middleware/extendedValidation.js';

const router = express.Router();

// Validation rules for polling endpoints
const pollOrdersValidation = [
  param('userId').isMongoId().withMessage('Valid user ID is required'),
  query('lastChecked').isISO8601().withMessage('Valid lastChecked timestamp is required (ISO 8601 format)')
];

const pollNotificationsValidation = [
  param('userId').isMongoId().withMessage('Valid user ID is required'),
  query('lastChecked').isISO8601().withMessage('Valid lastChecked timestamp is required (ISO 8601 format)'),
  query('markAsSeen').optional().isBoolean().withMessage('markAsSeen must be a boolean value')
];

const pollingStatsValidation = [
  param('userId').isMongoId().withMessage('Valid user ID is required')
];

// Polling routes with rate limiting and authentication

// GET /api/poll/orders/:userId?lastChecked=2024-01-01T00:00:00.000Z
router.get('/orders/:userId',
  authMiddleware,
  pollingRateLimit,
  pollOrdersValidation,
  handleValidationErrors,
  pollOrders
);

// GET /api/poll/notifications/:userId?lastChecked=2024-01-01T00:00:00.000Z&markAsSeen=true
router.get('/notifications/:userId',
  authMiddleware,
  pollingRateLimit,
  pollNotificationsValidation,
  handleValidationErrors,
  pollNotifications
);

// GET /api/poll/stats/:userId - Get polling statistics (for monitoring)
router.get('/stats/:userId',
  authMiddleware,
  pollingStatsValidation,
  handleValidationErrors,
  getPollingStats
);

export default router;




