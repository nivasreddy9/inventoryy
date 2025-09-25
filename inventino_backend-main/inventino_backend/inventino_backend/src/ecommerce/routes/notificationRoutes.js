import express from 'express';
import { body, param } from 'express-validator';
import Notification from '../models/Notification.js';
import User from '../models/User.js';
import authMiddleware from '../middleware/authMiddleware.js';
import { sendNotification } from '../utils/notificationService.js';
import { handleValidationErrors, validateObjectId } from '../middleware/extendedValidation.js';

const router = express.Router();

/**
 * @route POST /api/notifications/send
 * @desc Send a notification via specified channel
 * @access Private (authenticated users)
 * @body {
 *   userId: string (required),
 *   type: 'email' | 'sms' | 'push' | 'whatsapp' (required),
 *   message: string (required),
 *   subject: string (optional, for email),
 *   recipient: string (required, email address, phone number, or device token),
 *   provider: string (required, e.g. 'nodemailer', 'twilio', 'fcm', etc.),
 *   deviceToken: string (optional, for push notifications)
 * }
 * @returns {object} Notification document
 */
router.post('/send', authMiddleware, [
  body('userId').isMongoId().withMessage('Valid userId is required'),
  body('type').isIn(['email', 'sms', 'push', 'whatsapp']).withMessage('Invalid notification type'),
  body('message').isString().notEmpty().withMessage('Message is required'),
  body('recipient').isString().notEmpty().withMessage('Recipient is required'),
  body('provider').isString().notEmpty().withMessage('Provider is required'),
  body('subject').optional().isString(),
  body('deviceToken').optional().isString()
], handleValidationErrors, async (req, res) => {
  try {
    const notificationData = req.body;

    // Check if user exists
    const user = await User.findById(notificationData.userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check user preferences for notification type
    const preferences = user.preferences?.notifications || {};
    if (notificationData.type === 'email' && !preferences.email) {
      return res.status(403).json({ success: false, message: 'Email notifications are disabled for this user' });
    }
    if (notificationData.type === 'sms' && !preferences.sms) {
      return res.status(403).json({ success: false, message: 'SMS notifications are disabled for this user' });
    }
    if (notificationData.type === 'push' && !preferences.push) {
      return res.status(403).json({ success: false, message: 'Push notifications are disabled for this user' });
    }
    // WhatsApp preference can be added similarly if stored

    const notification = await sendNotification(notificationData);

    res.status(201).json({
      success: true,
      message: 'Notification sent',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to send notification',
      error: error.message
    });
  }
});

/**
 * @route GET /api/notifications/:userId
 * @desc Get all notifications for a user
 * @access Private (authenticated users)
 */
router.get('/:userId', authMiddleware, [
  param('userId').isMongoId().withMessage('Valid userId is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;

    const notifications = await Notification.find({ userId }).sort({ createdAt: -1 });

    res.json({
      success: true,
      message: 'Notifications retrieved',
      data: notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve notifications',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/notifications/:id/read
 * @desc Mark a notification as read
 * @access Private (authenticated users)
 */
router.put('/:id/read', authMiddleware, [
  param('id').isMongoId().withMessage('Valid notification id is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }

    await notification.markAsRead();

    res.json({
      success: true,
      message: 'Notification marked as read',
      data: notification
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update notification',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/notifications/preferences/:userId
 * @desc Update notification preferences for a user
 * @access Private (authenticated users)
 * @body {
 *   email: boolean,
 *   sms: boolean,
 *   push: boolean,
 *   whatsapp: boolean
 * }
 */
router.put('/preferences/:userId', authMiddleware, [
  param('userId').isMongoId().withMessage('Valid userId is required'),
  body('email').optional().isBoolean(),
  body('sms').optional().isBoolean(),
  body('push').optional().isBoolean(),
  body('whatsapp').optional().isBoolean()
], handleValidationErrors, async (req, res) => {
  try {
    const { userId } = req.params;
    const updates = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    user.preferences = user.preferences || {};
    user.preferences.notifications = {
      ...user.preferences.notifications,
      ...updates
    };

    await user.save();

    res.json({
      success: true,
      message: 'Notification preferences updated',
      data: user.preferences.notifications
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update preferences',
      error: error.message
    });
  }
});

export default router;
