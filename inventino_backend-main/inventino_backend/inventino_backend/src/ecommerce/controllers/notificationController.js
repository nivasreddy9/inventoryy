import Notification from '../models/notification.js';
import { validationResult } from 'express-validator';
import { sendPushNotification } from '../services/pushService.js';
import { sendEmail } from '../services/emailService.js';
import { sendSMS } from '../services/smsService.js';
import { sendWhatsAppMessage } from '../services/whatsappService.js';

// Send notification
export const sendNotification = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { userId, type, title, message, channel, priority, metadata, scheduledAt, language } = req.body;

    // Create notification record
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      channel,
      priority: priority || 'medium',
      metadata,
      scheduledAt,
      language: language || 'en',
      createdBy: req.user?.id // Assuming auth middleware sets req.user
    });

    await notification.save();

    // If scheduled, don't send immediately
    if (scheduledAt && new Date(scheduledAt) > new Date()) {
      return res.status(201).json({
        success: true,
        message: 'Notification scheduled successfully',
        data: notification
      });
    }

    // Send notification based on channel
    let sendResult;
    try {
      switch (channel) {
        case 'push':
          sendResult = await sendPushNotification(userId, title, message, metadata);
          break;
        case 'email':
          sendResult = await sendEmail(userId, title, message, metadata);
          break;
        case 'sms':
          sendResult = await sendSMS(userId, message, metadata);
          break;
        case 'whatsapp':
          sendResult = await sendWhatsAppMessage(userId, message, metadata);
          break;
        default:
          throw new Error('Invalid notification channel');
      }

      // Mark as sent
      await notification.markAsSent();

      res.status(201).json({
        success: true,
        message: 'Notification sent successfully',
        data: {
          notification,
          sendResult
        }
      });
    } catch (sendError) {
      // Mark as failed
      await notification.markAsFailed(sendError.message);

      res.status(500).json({
        success: false,
        message: 'Failed to send notification',
        error: sendError.message
      });
    }

  } catch (error) {
    console.error('Send notification error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user notifications
export const getUserNotifications = async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 20, status, type } = req.query;

    const query = { userId };
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (page - 1) * limit;

    const notifications = await Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .populate('metadata.orderId', 'orderNumber status totalAmount')
      .populate('metadata.productId', 'name price images')
      .populate('createdBy', 'name email');

    const total = await Notification.countDocuments(query);

    res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalNotifications: total,
          hasNext: page * limit < total,
          hasPrev: page > 1
        }
      }
    });

  } catch (error) {
    console.error('Get user notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update notification status (Admin API)
export const updateNotificationStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, errorMessage } = req.body;

    const notification = await Notification.findById(id);
    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Update status
    if (status === 'delivered') {
      await notification.markAsDelivered();
    } else if (status === 'failed') {
      await notification.markAsFailed(errorMessage);
    } else {
      notification.status = status;
      if (status === 'sent') {
        notification.sentAt = new Date();
      }
      await notification.save();
    }

    res.json({
      success: true,
      message: 'Notification status updated successfully',
      data: notification
    });

  } catch (error) {
    console.error('Update notification status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get notification statistics
export const getNotificationStats = async (req, res) => {
  try {
    const { userId } = req.params;
    const { startDate, endDate } = req.query;

    const matchConditions = { userId };
    if (startDate && endDate) {
      matchConditions.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const stats = await Notification.aggregate([
      { $match: matchConditions },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      }
    ]);

    const total = stats.reduce((sum, stat) => sum + stat.count, 0);

    res.json({
      success: true,
      data: {
        total,
        byStatus: stats.reduce((acc, stat) => {
          acc[stat._id] = stat.count;
          return acc;
        }, {}),
        period: {
          startDate,
          endDate
        }
      }
    });

  } catch (error) {
    console.error('Get notification stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Retry failed notifications
export const retryFailedNotifications = async (req, res) => {
  try {
    const { userId } = req.params;

    const failedNotifications = await Notification.find({
      userId,
      status: 'failed',
      retryCount: { $lt: 3 } // Max retries
    });

    const retryResults = [];

    for (const notification of failedNotifications) {
      try {
        // Attempt to resend based on channel
        let sendResult;
        switch (notification.channel) {
          case 'push':
            sendResult = await sendPushNotification(notification.userId, notification.title, notification.message, notification.metadata);
            break;
          case 'email':
            sendResult = await sendEmail(notification.userId, notification.title, notification.message, notification.metadata);
            break;
          case 'sms':
            sendResult = await sendSMS(notification.userId, notification.message, notification.metadata);
            break;
          case 'whatsapp':
            sendResult = await sendWhatsAppMessage(notification.userId, notification.message, notification.metadata);
            break;
        }

        await notification.markAsSent();
        retryResults.push({
          id: notification._id,
          success: true,
          result: sendResult
        });

      } catch (retryError) {
        await notification.markAsFailed(retryError.message);
        retryResults.push({
          id: notification._id,
          success: false,
          error: retryError.message
        });
      }
    }

    res.json({
      success: true,
      message: 'Retry process completed',
      data: {
        totalAttempted: failedNotifications.length,
        results: retryResults
      }
    });

  } catch (error) {
    console.error('Retry failed notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
