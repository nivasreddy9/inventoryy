import express from 'express';
import jwt from 'jsonwebtoken';
import { body } from 'express-validator';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import Admin from '../models/Admin.js';
import User from '../models/User.js';
import authMiddleware, { adminOnly } from '../middleware/authMiddleware.js';
import { validateAdminRegistration, validateEmail, validatePasswordReset, handleValidationErrors, validateObjectId } from '../middleware/extendedValidation.js';

const router = express.Router();

// Admin Registration
/**
 * @route POST /api/admin/register
 * @desc Register a new admin account
 * @access Public
 * @param {string} email - Admin's email address
 * @param {string} password - Admin's password (min 6 chars, must contain uppercase, lowercase, number, special char)
 * @param {string} firstName - Admin's first name
 * @param {string} lastName - Admin's last name
 * @returns {object} Success message
 */
router.post('/register', validateAdminRegistration, handleValidationErrors, async (req, res) => {
  const { email, password, firstName, lastName } = req.body;
  
  try {
    const admin = new Admin({ email, password, firstName, lastName, role: 'admin' });
    await admin.save();
    res.status(201).json({ message: 'Admin registered successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

/**
 * @route POST /api/admin/login
 * @desc Authenticate admin and return JWT token
 * @access Public
 * @param {string} email - Admin's email address
 * @param {string} password - Admin's password
 * @returns {object} JWT token and admin data
 */
router.post('/login', [
  body('email').isEmail().withMessage('Please provide a valid email address').normalizeEmail(),
  body('password').notEmpty().withMessage('Password is required')
], handleValidationErrors, async (req, res) => {
  try {
    const { email, password } = req.body;

    const admin = await Admin.findOne({ email });
    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Authentication failed',
        errors: [{
          field: 'email',
          message: 'No admin account found with this email address'
        }]
      });
    }

    // Temporarily disabled for testing - remove this block in production
    // if (!admin.isVerified) {
    //   return res.status(401).json({
    //     success: false,
    //     message: 'Authentication failed',
    //     errors: [{
    //       field: 'email',
    //       message: 'Please verify your email address before logging in'
    //     }]
    //   });
    // }

    const isMatch = await admin.comparePassword(password);
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

    const token = jwt.sign(
      { id: admin._id, email: admin.email, role: admin.role },
      process.env.JWT_SECRET || 'fallback-secret',
      { expiresIn: '24h' }
    );

    res.json({
      success: true,
      message: 'Admin login successful',
      data: {
        token,
        admin: {
          id: admin._id,
          email: admin.email,
          firstName: admin.firstName,
          lastName: admin.lastName,
          role: admin.role
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/verify-email
 * @desc Send email verification link to admin
 * @access Public
 * @param {string} email - Admin's email address
 * @returns {object} Success message with verification instructions
 */
router.post('/verify-email', validateEmail, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Email verification failed',
        errors: [{
          field: 'email',
          message: 'No admin account found with this email address'
        }]
      });
    }

    if (admin.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Email verification failed',
        errors: [{
          field: 'email',
          message: 'Email address is already verified'
        }]
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    admin.verificationToken = verificationToken;
    await admin.save();

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(503).json({
        success: false,
        message: 'Email verification failed',
        errors: [{
          field: 'email',
          message: 'Email service is not configured. Please contact support.'
        }]
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      to: email,
      subject: 'Email Verification - Your Account',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Welcome to Our Platform!</h2>
          <p>Thank you for registering. Please click the link below to verify your email address:</p>
          <p><a href="http://localhost:${process.env.ECOMMERCE_PORT || 5000}/api/admin/verify/${verificationToken}" 
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
               Verify Email Address
          </a></p>
          <p>If you didn\'t create this account, please ignore this email.</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Email verification failed',
          errors: [{
            field: 'email',
            message: 'Failed to send verification email. Please try again later.'
          }]
        });
      }
      res.status(200).json({
        success: true,
        message: 'Verification email sent successfully',
        data: {
          email: admin.email,
          message: 'Please check your email for verification instructions'
        }
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/verify/:token
 * @desc Verify admin email using token from email link
 * @access Public
 * @param {string} token - Email verification token
 * @returns {object} Success message confirming email verification
 */
router.get('/verify/:token', validateObjectId('token'), handleValidationErrors, async (req, res) => {
  try {
    const admin = await Admin.findOne({ verificationToken: req.params.token });
    
    if (!admin) {
      return res.status(400).json({
        success: false,
        message: 'Email verification failed',
        errors: [{
          field: 'token',
          message: 'Invalid or expired verification token'
        }]
      });
    }

    admin.isVerified = true;
    admin.verificationToken = undefined;
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        email: admin.email,
        message: 'Your email address has been verified successfully'
      }
    });
  }
 catch (error) {
    res.status(500).json({
      success: false,
      message: 'Email verification failed',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/forgot-password
 * @desc Send password reset email to admin
 * @access Public
 * @param {string} email - Admin's email address
 * @returns {object} Success message with password reset instructions
 */
router.post('/forgot-password', validateEmail, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;
    const admin = await Admin.findOne({ email });
    
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Password reset failed',
        errors: [{
          field: 'email',
          message: 'No admin account found with this email address'
        }]
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await admin.save();

    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(503).json({
        success: false,
        message: 'Password reset failed',
        errors: [{
          field: 'email',
          message: 'Email service is not configured. Please contact support.'
        }]
      });
    }

    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      to: email,
      subject: 'Password Reset Request',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Password Reset Request</h2>
          <p>You are receiving this email because you (or someone else) requested a password reset for your account.</p>
          <p>Please click the link below to reset your password:</p>
          <p><a href="http://localhost:${process.env.ECOMMERCE_PORT || 5000}/api/admin/reset-password/${resetToken}" 
               style="background-color: #dc3545; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
               Reset Password
          </a></p>
          <p>If you did not request this, please ignore this email and your password will remain unchanged.</p>
          <p>This link will expire in 1 hour.</p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return res.status(500).json({
          success: false,
          message: 'Password reset failed',
          errors: [{
            field: 'email',
            message: 'Failed to send reset email. Please try again later.'
          }]
        });
      }
      res.status(200).json({
        success: true,
        message: 'Password reset email sent successfully',
        data: {
          email: admin.email,
          message: 'Please check your email for password reset instructions'
        }
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/reset-password
 * @desc Reset admin password using token from email
 * @access Public
 * @param {string} token - Password reset token
 * @param {string} newPassword - New password (min 6 chars, must contain uppercase, lowercase, number, special char)
 * @returns {object} Success message confirming password reset
 */
router.post('/reset-password', validatePasswordReset, handleValidationErrors, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const admin = await Admin.findOne({ 
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!admin) {
      return res.status(400).json({
        success: false,
        message: 'Password reset failed',
        errors: [{
          field: 'token',
          message: 'Invalid or expired reset token'
        }]
      });
    }

    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{6,128}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({
        success: false,
        message: 'Password reset failed',
        errors: [{
          field: 'newPassword',
          message: 'Password must be 6-128 characters and contain at least one uppercase letter, one lowercase letter, one number, and one special character'
        }]
      });
    }

    admin.password = newPassword;
    admin.resetPasswordToken = undefined;
    admin.resetPasswordExpires = undefined;
    await admin.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: {
        email: admin.email,
        message: 'Your password has been updated successfully'
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Password reset failed',
      error: error.message
    });
  }
});

/**
 * @route POST /api/admin/logout
 * @desc Logout admin (client-side token removal)
 * @access Private (requires authentication)
 * @returns {object} Success message confirming logout
 */
router.post('/logout', authMiddleware, async (req, res) => {
  try {
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
 * @route GET /api/admin/profile
 * @desc Get current admin profile information
 * @access Private (admin only)
 * @returns {object} Admin profile data (excluding password)
 */
router.get('/profile', authMiddleware, adminOnly, async (req, res) => {
  try {
    const adminId = req.user.id;
    const admin = await Admin.findById(adminId).select('-password');

    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin profile not found',
        errors: [{
          field: 'admin',
          message: 'Admin profile could not be retrieved'
        }]
      });
    }

    res.json({
      success: true,
      message: 'Admin profile retrieved successfully',
      data: admin
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve admin profile',
      error: error.message
    });
  }
});



export default router;
