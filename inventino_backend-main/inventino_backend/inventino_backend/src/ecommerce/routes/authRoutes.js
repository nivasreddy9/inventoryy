import express from 'express';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { body, validationResult } from 'express-validator';
import nodemailer from 'nodemailer';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import {
  validateEmail,
  validatePasswordReset,
  handleValidationErrors,
  validateObjectId
} from '../middleware/extendedValidation.js';

const router = express.Router();

// Email Verification
router.post('/verify-email', validateEmail, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Email verification failed',
        errors: [{
          field: 'email',
          message: 'No account found with this email address'
        }]
      });
    }

    if (user.isVerified) {
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
    user.verificationToken = verificationToken;
    await user.save();

    // Check if email configuration exists
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

    // Send verification email
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
          <p><a href="http://localhost:${process.env.ECOMMERCE_PORT || 5000}/api/auth/verify/${verificationToken}" 
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
        console.error('Email error:', error);
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
          email: user.email,
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

// Resend Verification
router.post('/resend-verification', validateEmail, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Verification failed',
        errors: [{
          field: 'email',
          message: 'No account found with this email address'
        }]
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        success: false,
        message: 'Verification failed',
        errors: [{
          field: 'email',
          message: 'Email address is already verified'
        }]
      });
    }

    const verificationToken = crypto.randomBytes(32).toString('hex');
    user.verificationToken = verificationToken;
    await user.save();

    // Check if email configuration exists
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      return res.status(503).json({
        success: false,
        message: 'Verification failed',
        errors: [{
          field: 'email',
          message: 'Email service is not configured. Please contact support.'
        }]
      });
    }

    // Send verification email
    const transporter = nodemailer.createTransport({
      service: 'Gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    const mailOptions = {
      to: email,
      subject: 'Email Verification - Resend',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>Email Verification Reminder</h2>
          <p>Please click the link below to verify your email address:</p>
          <p><a href="http://localhost:${process.env.ECOMMERCE_PORT || 5000}/api/auth/verify/${verificationToken}" 
               style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
               Verify Email Address
          </a></p>
          <p>If you didn\'t request this verification, please ignore this email.</p>
          <p>This link will expire in 24 hours.</p>
        </div>
      `,
    };

    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        console.error('Email error:', error);
        return res.status(500).json({
          success: false,
          message: 'Verification failed',
          errors: [{
            field: 'email',
            message: 'Failed to send verification email. Please try again later.'
          }]
        });
      }
      res.status(200).json({
        success: true,
        message: 'Verification email resent successfully',
        data: {
          email: user.email,
          message: 'Please check your email for verification instructions'
        }
      });
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Verification failed',
      error: error.message
    });
  }
});

// Forgot Password
router.post('/forgot-password', validateEmail, handleValidationErrors, async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'Password reset failed',
        errors: [{
          field: 'email',
          message: 'No account found with this email address'
        }]
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
    await user.save();

    // Check if email configuration exists
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

    // Send reset password email
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
          <p><a href="http://localhost:${process.env.ECOMMERCE_PORT || 5000}/api/auth/reset-password/${resetToken}" 
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
        console.error('Email error:', error);
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
          email: user.email,
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

// Reset Password
router.post('/reset-password', validatePasswordReset, handleValidationErrors, async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    
    const user = await User.findOne({ 
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Password reset failed',
        errors: [{
          field: 'token',
          message: 'Invalid or expired reset token'
        }]
      });
    }

    // Validate password strength
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

    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password reset successfully',
      data: {
        email: user.email,
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

// Verify email token
router.get('/verify/:token', validateObjectId('token'), handleValidationErrors, async (req, res) => {
  try {
    const user = await User.findOne({ verificationToken: req.params.token });
    
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Email verification failed',
        errors: [{
          field: 'token',
          message: 'Invalid or expired verification token'
        }]
      });
    }

    user.isVerified = true;
    user.verificationToken = undefined;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Email verified successfully',
      data: {
        email: user.email,
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

export default router;