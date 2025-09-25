import UserPreferences from '../models/userPreferences.js';
import { validationResult } from 'express-validator';

// Get user preferences
export const getUserPreferences = async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can only access their own preferences, admins can access any
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only view your own preferences.'
      });
    }

    let preferences = await UserPreferences.getUserPreferences(userId);

    // If no preferences exist, create default ones
    if (!preferences) {
      preferences = new UserPreferences({
        userId,
        notifications: {
          push: { enabled: true, types: ['order', 'system'] },
          email: { enabled: true, types: ['order', 'promotion', 'system'] },
          sms: { enabled: false, types: ['order', 'security'] },
          whatsapp: { enabled: false, types: ['order', 'support'] }
        }
      });
      await preferences.save();
    }

    res.json({
      success: true,
      data: preferences
    });

  } catch (error) {
    console.error('Get user preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Update user preferences
export const updateUserPreferences = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation errors',
        errors: errors.array()
      });
    }

    const { userId } = req.params;
    const updateData = req.body;

    // Users can only update their own preferences, admins can update any
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only update your own preferences.'
      });
    }

    // Find existing preferences or create new ones
    let preferences = await UserPreferences.findOne({ userId });

    if (!preferences) {
      preferences = new UserPreferences({
        userId,
        ...updateData
      });
    } else {
      // Update existing preferences
      Object.keys(updateData).forEach(key => {
        if (key !== 'userId') {
          preferences[key] = updateData[key];
        }
      });
    }

    await preferences.save();

    res.json({
      success: true,
      message: 'Preferences updated successfully',
      data: preferences
    });

  } catch (error) {
    console.error('Update user preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Get user notification channels for a specific type
export const getAllowedChannels = async (req, res) => {
  try {
    const { userId } = req.params;
    const { type } = req.query;

    if (!type) {
      return res.status(400).json({
        success: false,
        message: 'Notification type is required'
      });
    }

    // Users can only access their own preferences, admins can access any
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied.'
      });
    }

    const preferences = await UserPreferences.getUserPreferences(userId);

    if (!preferences) {
      // Return default channels if no preferences set
      return res.json({
        success: true,
        data: {
          type,
          allowedChannels: ['push', 'email'],
          preferences: null
        }
      });
    }

    const allowedChannels = preferences.getAllowedChannels(type);

    res.json({
      success: true,
      data: {
        type,
        allowedChannels,
        preferences: preferences.notifications
      }
    });

  } catch (error) {
    console.error('Get allowed channels error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Reset user preferences to defaults
export const resetUserPreferences = async (req, res) => {
  try {
    const { userId } = req.params;

    // Users can only reset their own preferences, admins can reset any
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin' && req.user.id !== userId) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. You can only reset your own preferences.'
      });
    }

    const defaultPreferences = {
      userId,
      notifications: {
        push: { enabled: true, types: ['order', 'system'] },
        email: { enabled: true, types: ['order', 'promotion', 'system'] },
        sms: { enabled: false, types: ['order', 'security'] },
        whatsapp: { enabled: false, types: ['order', 'support'] }
      },
      language: 'en',
      timezone: 'UTC',
      marketingConsent: false,
      dataRetention: true
    };

    const preferences = await UserPreferences.findOneAndUpdate(
      { userId },
      defaultPreferences,
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      message: 'Preferences reset to defaults successfully',
      data: preferences
    });

  } catch (error) {
    console.error('Reset user preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};

// Bulk update preferences for multiple users (Admin only)
export const bulkUpdatePreferences = async (req, res) => {
  try {
    const { userIds, preferences } = req.body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'User IDs array is required'
      });
    }

    if (!preferences) {
      return res.status(400).json({
        success: false,
        message: 'Preferences data is required'
      });
    }

    // Only admins can perform bulk updates
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Admin privileges required.'
      });
    }

    const bulkOps = userIds.map(userId => ({
      updateOne: {
        filter: { userId },
        update: { ...preferences, userId },
        upsert: true
      }
    }));

    const result = await UserPreferences.bulkWrite(bulkOps);

    res.json({
      success: true,
      message: `Preferences updated for ${userIds.length} users`,
      data: {
        matched: result.matchedCount,
        modified: result.modifiedCount,
        upserted: result.upsertedCount
      }
    });

  } catch (error) {
    console.error('Bulk update preferences error:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message
    });
  }
};
