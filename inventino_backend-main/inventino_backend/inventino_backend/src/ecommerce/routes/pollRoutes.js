// Express router setup and export
import express from 'express';
const router = express.Router();

import Order from '../models/Order.js';
import Notification from '../models/notification.js';
import Polling from '../models/poll.js';
import { validationResult } from 'express-validator';
import authMiddleware from '../middleware/authMiddleware.js';

// Poll for order updates since lastChecked timestamp
export const pollOrders = async (req, res) => {
  const startTime = Date.now();
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { lastChecked } = req.query;

  // Ensure the authenticated user can only poll their own orders, unless they are an admin
  if (req.user.role !== 'admin' && req.user.id !== userId && req.user._id !== userId) {
    return res.status(403).json({
      success: false,
      message: 'Access denied. You can only poll your own orders.'
    });
  }

    // Parse lastChecked timestamp
    const lastCheckedDate = new Date(lastChecked);

    // Validate timestamp
    if (isNaN(lastCheckedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lastChecked timestamp'
      });
    }

    // Query for orders updated since lastChecked
    // Include orders that have been updated (status changes, shipment updates, etc.)
    const updatedOrders = await Order.find({
      user: userId,
      $or: [
        { updatedAt: { $gt: lastCheckedDate } },
        { 'shipmentDetails.shipmentDate': { $gt: lastCheckedDate } },
        { 'shipmentDetails.expectedDeliveryDate': { $gt: lastCheckedDate } }
      ]
    })
    .select({
      orderNumber: 1,
      orderStatus: 1,
      paymentStatus: 1,
      shipmentDetails: 1,
      totalAmount: 1,
      updatedAt: 1,
      createdAt: 1
    })
    .sort({ updatedAt: -1 })
    .limit(50); // Limit results to prevent large payloads

    // Return minimal data for efficiency
    const orders = updatedOrders.map(order => ({
      id: order._id,
      orderNumber: order.orderNumber,
      orderStatus: order.orderStatus,
      paymentStatus: order.paymentStatus,
      shipmentDetails: {
        shipmentStatus: order.shipmentDetails?.shipmentStatus,
        awbNumber: order.shipmentDetails?.awbNumber,
        courier: order.shipmentDetails?.courier,
        expectedDeliveryDate: order.shipmentDetails?.expectedDeliveryDate,
        trackingUrl: order.shipmentDetails?.trackingUrl
      },
      totalAmount: order.totalAmount,
      updatedAt: order.updatedAt
    }));

    // Log the polling activity
    try {
      const pollingLog = new Polling({
        userId: userId,
        pollType: 'orders',
        lastChecked: lastCheckedDate,
        resultCount: orders.length,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress,
        responseTime: Date.now() - startTime,
        status: 'success',
        metadata: {
          ordersUpdated: orders.length
        }
      });
      await pollingLog.save();
    } catch (logError) {
      console.error('Failed to log polling activity:', logError);
      // Don't fail the request if logging fails
    }

    res.json({
      success: true,
      data: {
        orders,
        count: orders.length,
        lastChecked: lastChecked,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Poll orders error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Poll for new notifications since lastChecked timestamp
export const pollNotifications = async (req, res) => {
  const startTime = Date.now();
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const { lastChecked, markAsSeen = false } = req.query;

    // Ensure the authenticated user can only poll their own notifications, unless they are an admin
    if (req.user.role !== 'admin' && req.user.id !== userId && req.user._id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only poll your own notifications.'
      });
    }

    // Parse lastChecked timestamp
    const lastCheckedDate = new Date(lastChecked);

    // Validate timestamp
    if (isNaN(lastCheckedDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid lastChecked timestamp'
      });
    }

    // Query for new notifications since lastChecked
    const newNotifications = await Notification.find({
      userId: userId,
      createdAt: { $gt: lastCheckedDate },
      status: { $ne: 'failed' } // Don't return failed notifications
    })
    .select({
      type: 1,
      title: 1,
      message: 1,
      channel: 1,
      priority: 1,
      status: 1,
      metadata: 1,
      createdAt: 1
    })
    .sort({ createdAt: -1 })
    .limit(50); // Limit results to prevent large payloads

    // Optionally mark notifications as seen
    if (markAsSeen && newNotifications.length > 0) {
      const notificationIds = newNotifications.map(n => n._id);
      await Notification.updateMany(
        { _id: { $in: notificationIds }, status: { $ne: 'delivered' } },
        { status: 'delivered', deliveredAt: new Date() }
      );
    }

    // Return minimal data for efficiency
    const notifications = newNotifications.map(notification => ({
      id: notification._id,
      type: notification.type,
      title: notification.title,
      message: notification.message,
      channel: notification.channel,
      priority: notification.priority,
      status: notification.status,
      metadata: {
        orderId: notification.metadata?.orderId,
        productId: notification.metadata?.productId
      },
      createdAt: notification.createdAt
    }));

    // Log the polling activity
    try {
      const pollingLog = new Polling({
        userId: userId,
        pollType: 'notifications',
        lastChecked: lastCheckedDate,
        resultCount: notifications.length,
        userAgent: req.get('User-Agent'),
        ipAddress: req.ip || req.connection.remoteAddress,
        responseTime: Date.now() - startTime,
        status: 'success',
        metadata: {
          markAsSeen: markAsSeen,
          notificationsMarked: markAsSeen ? notifications.length : 0
        }
      });
      await pollingLog.save();
    } catch (logError) {
      console.error('Failed to log polling activity:', logError);
      // Don't fail the request if logging fails
    }

    res.json({
      success: true,
      data: {
        notifications,
        count: notifications.length,
        lastChecked: lastChecked,
        timestamp: new Date().toISOString(),
        markedAsSeen: markAsSeen && notifications.length > 0
      }
    });

  } catch (error) {
    console.error('Poll notifications error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get current status of a specific order
export const getOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;

    // Find the order
    const order = await Order.findById(orderId).select({
      user: 1,
      orderStatus: 1,
      shipmentDetails: 1,
      totalAmount: 1,
      updatedAt: 1
    });

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Ensure the authenticated user can only view their own orders, unless they are an admin
    if (req.user.role !== 'admin' && req.user.id !== order.user.toString() && req.user._id !== order.user.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own orders.'
      });
    }

    // Return minimal data for efficiency
    res.json({
      success: true,
      data: {
        orderId: order._id,
        orderStatus: order.orderStatus,
        shipmentDetails: {
          shipmentStatus: order.shipmentDetails?.shipmentStatus,
          expectedDeliveryDate: order.shipmentDetails?.expectedDeliveryDate,
          trackingUrl: order.shipmentDetails?.trackingUrl
        },
        totalAmount: order.totalAmount,
        updatedAt: order.updatedAt,
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get order status error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get polling statistics (for monitoring/debugging)
export const getPollingStats = async (req, res) => {
  try {
    const { userId } = req.params;

    // Ensure the authenticated user can only view their own stats
    if (req.user.id !== userId && req.user._id !== userId && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    // Get recent order updates count
    const recentOrderUpdates = await Order.countDocuments({
      user: userId,
      updatedAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    // Get recent notifications count
    const recentNotifications = await Notification.countDocuments({
      userId: userId,
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) } // Last 24 hours
    });

    res.json({
      success: true,
      data: {
        userId,
        recentOrderUpdates,
        recentNotifications,
        totalOrders: await Order.countDocuments({ user: userId }),
        totalNotifications: await Notification.countDocuments({ userId }),
        timestamp: new Date().toISOString()
      }
    });

  } catch (error) {
    console.error('Get polling stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Define routes
router.get('/orders/:userId', authMiddleware, pollOrders);
router.get('/order/:orderId', authMiddleware, getOrderStatus);
router.get('/notifications/:userId', authMiddleware, pollNotifications);
router.get('/stats/:userId', authMiddleware, getPollingStats);

export default router;





