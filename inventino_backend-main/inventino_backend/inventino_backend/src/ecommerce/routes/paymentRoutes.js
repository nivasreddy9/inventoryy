import express from 'express';
import { body, param, validationResult } from 'express-validator';
import PaymentController from '../controllers/paymentController.js';

const router = express.Router();

// Initiate Payment
router.post(
  '/initiate',
  body('amount').isFloat({ gt: 0 }),
  body('currency').isString().isLength({ min: 3, max: 3 }),
  body('customerInfo').isObject(),
  body('paymentMethod').isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const payment = await PaymentController.initiatePayment(req.body);
      res.json(payment);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Verify Payment Status
router.get(
  '/status/:paymentId',
  param('paymentId').isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const status = await PaymentController.verifyPaymentStatus(req.params.paymentId);
      res.json(status);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

// Initiate Refund
router.post(
  '/refund',
  body('paymentId').isString(),
  body('refundAmount').isFloat({ gt: 0 }),
  body('reason').optional().isString(),
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }
    try {
      const refund = await PaymentController.initiateRefund(req.body);
      res.json(refund);
    } catch (error) {
      res.status(500).json({ error: error.message });
    }
  }
);

export default router;
