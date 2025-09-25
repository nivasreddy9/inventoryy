import Notification from '../models/Notification.js';
import { sendOTPEmail } from './emailService.js';
import twilio from 'twilio';
import admin from 'firebase-admin';
import sgMail from '@sendgrid/mail';

// Initialize Twilio client (use environment variables)
let twilioClient = null;
if (process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN) {
  twilioClient = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);
} else {
  console.warn('Twilio credentials not found. SMS and WhatsApp notifications will not work.');
}

// Initialize Firebase Admin SDK for FCM (if not already initialized)
if (!admin.apps.length && process.env.FIREBASE_SERVICE_ACCOUNT) {
  try {
    admin.initializeApp({
      credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT))
    });
  } catch (error) {
    console.warn('Firebase initialization failed:', error.message);
    console.warn('Push notifications will not work until Firebase is properly configured');
  }
}

// Initialize SendGrid
if (process.env.SENDGRID_API_KEY) {
  sgMail.setApiKey(process.env.SENDGRID_API_KEY);
} else {
  console.warn('SendGrid API key not found. SendGrid email notifications will not work.');
}

/**
 * Send email notification using Nodemailer or SendGrid
 * @param {Object} notificationData
 * @returns {Promise<Object>} provider response
 */
async function sendEmailNotification(notificationData) {
  const { recipient, subject, message, provider } = notificationData;

  if (provider === 'sendgrid') {
    const msg = {
      to: recipient,
      from: process.env.EMAIL_USER,
      subject: subject || 'Notification',
      text: message
    };
    const response = await sgMail.send(msg);
    return response;
  } else {
    // Default to nodemailer
    // Reuse sendOTPEmail function for sending email (adapted)
    // Here we create a simple sendEmail function inline
    // For simplicity, we use sendOTPEmail with message as OTP text
    // In real case, create a dedicated sendEmail function in emailService.js
    await sendOTPEmail(recipient, message);
    return { message: 'Email sent via nodemailer' };
  }
}

/**
 * Send SMS notification using Twilio or MSG91 (placeholder)
 * @param {Object} notificationData
 * @returns {Promise<Object>} provider response
 */
async function sendSMSNotification(notificationData) {
  const { recipient, message, provider } = notificationData;

  if (provider === 'twilio') {
    const response = await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to: recipient
    });
    return response;
  } else if (provider === 'msg91') {
    // Placeholder for MSG91 integration
    // Implement MSG91 API call here
    return { message: 'SMS sent via MSG91 (placeholder)' };
  } else {
    throw new Error('Unsupported SMS provider');
  }
}

/**
 * Send push notification using FCM or OneSignal (placeholder)
 * @param {Object} notificationData
 * @returns {Promise<Object>} provider response
 */
async function sendPushNotification(notificationData) {
  const { deviceToken, message, provider } = notificationData;

  if (provider === 'fcm') {
    const messagePayload = {
      token: deviceToken,
      notification: {
        title: 'Notification',
        body: message
      }
    };
    const response = await admin.messaging().send(messagePayload);
    return response;
  } else if (provider === 'onesignal') {
    // Placeholder for OneSignal integration
    // Implement OneSignal API call here
    return { message: 'Push notification sent via OneSignal (placeholder)' };
  } else {
    throw new Error('Unsupported push notification provider');
  }
}

/**
 * Send WhatsApp notification using WhatsApp Business API or Twilio (placeholder)
 * @param {Object} notificationData
 * @returns {Promise<Object>} provider response
 */
async function sendWhatsAppNotification(notificationData) {
  const { recipient, message, provider } = notificationData;

  if (provider === 'twilio') {
    // Twilio WhatsApp API integration
    const response = await twilioClient.messages.create({
      body: message,
      from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
      to: `whatsapp:${recipient}`
    });
    return response;
  } else if (provider === 'whatsapp_business') {
    // Placeholder for WhatsApp Business API integration
    // Implement WhatsApp Business API call here
    return { message: 'WhatsApp message sent via WhatsApp Business API (placeholder)' };
  } else {
    throw new Error('Unsupported WhatsApp provider');
  }
}

/**
 * Main function to send notification based on type
 * @param {Object} notificationData
 * @returns {Promise<Notification>} saved notification document
 */
export async function sendNotification(notificationData) {
  const {
    userId,
    type,
    message,
    subject,
    recipient,
    provider,
    deviceToken
  } = notificationData;

  // Create notification document with status pending
  const notification = new Notification({
    userId,
    type,
    message,
    status: 'pending',
    isRead: false,
    provider,
    recipient,
    subject,
    deviceToken
  });

  try {
    let providerResponse;

    switch (type) {
      case 'email':
        providerResponse = await sendEmailNotification(notificationData);
        break;
      case 'sms':
        providerResponse = await sendSMSNotification(notificationData);
        break;
      case 'push':
        providerResponse = await sendPushNotification(notificationData);
        break;
      case 'whatsapp':
        providerResponse = await sendWhatsAppNotification(notificationData);
        break;
      default:
        throw new Error('Unsupported notification type');
    }

    // Update notification status to sent
    await notification.updateStatus('sent', providerResponse, null);
  } catch (error) {
    // Update notification status to failed with error message
    await notification.updateStatus('failed', null, error.message);
  }

  return notification;
}
