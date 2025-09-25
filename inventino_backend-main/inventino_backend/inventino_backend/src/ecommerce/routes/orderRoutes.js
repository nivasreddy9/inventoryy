import express from 'express';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import {
    validateOrderCreation,
    validateOrderStatusUpdate,
    handleValidationErrors,
    validateObjectId,
    validateReturnRequest,
    validateShipmentUpdate
} from '../middleware/extendedValidation.js';
import authMiddleware, { adminOnly, logisticsOnly } from '../middleware/authMiddleware.js';

// Email notification service stub
const sendOrderNotification = async (type, order, userEmail) => {
    // TODO: Implement actual email service (e.g., using nodemailer)
    console.log(`Sending ${type} notification to ${userEmail} for order ${order.orderNumber}`);

    // Handle different notification types
    switch (type) {
        case 'order_created':
            console.log(`Order ${order.orderNumber} has been created successfully.`);
            break;
        case 'order_cancelled':
            console.log(`Order ${order.orderNumber} has been cancelled.`);
            break;
        case 'order_reordered':
            console.log(`Order ${order.orderNumber} has been reordered.`);
            break;
        case 'shipment_updated':
            console.log(`Shipment details updated for order ${order.orderNumber}. AWB: ${order.shipmentDetails?.awbNumber || 'N/A'}, Courier: ${order.shipmentDetails?.courier || 'N/A'}`);
            break;
        default:
            console.log(`Notification type ${type} sent for order ${order.orderNumber}`);
    }

    // Stub implementation - replace with actual email service
    return true;
};

const router = express.Router();

// Get User's Order History
router.get('/', authMiddleware, async (req, res) => {
    try {
        const { page = 1, limit = 10, status, shipmentStatus } = req.query;
        const query = { user: req.user.id };

        if (status) {
            query.orderStatus = status;
        }

        if (shipmentStatus) {
            query['shipmentDetails.shipmentStatus'] = shipmentStatus;
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('items.product', 'name price images category')
            .populate('user', 'name email');

        const total = await Order.countDocuments(query);

        res.json({
            orders,
            pagination: {
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                totalOrders: total,
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Get All Orders (Admin Only) with Pagination
router.get('/admin/orders', authMiddleware, adminOnly, async (req, res) => {
    try {
        const { page = 1, limit = 6, status, shipmentStatus, user } = req.query;
        const query = {};

        if (status) {
            query.orderStatus = status;
        }

        if (shipmentStatus) {
            query['shipmentDetails.shipmentStatus'] = shipmentStatus;
        }

        if (user) {
            query.user = user;
        }

        const orders = await Order.find(query)
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .populate('items.product', 'name price images category')
            .populate('user', 'name email');

        const total = await Order.countDocuments(query);

        res.json({
            orders,
            pagination: {
                totalOrders: total,
                totalPages: Math.ceil(total / limit),
                currentPage: parseInt(page),
                hasNextPage: page < Math.ceil(total / limit),
                hasPrevPage: page > 1
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Place Order
router.post('/', authMiddleware, validateOrderCreation, handleValidationErrors, async (req, res) => {
    const { items, shippingAddress, paymentMethod } = req.body;
    try {
        // Generate unique order number
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const orderNumber = `ORD-${timestamp}-${random}`;

        const order = new Order({
            user: req.user.id,
            orderNumber,
            items,
            shippingAddress,
            paymentMethod,
            totalAmount: items.reduce((total, item) => total + item.price * item.quantity, 0)
        });
        await order.save();

        // Send order confirmation email
        try {
            await sendOrderNotification('order_created', order, req.user.email);
        } catch (emailError) {
            console.error('Failed to send order confirmation email:', emailError);
        }

        res.status(201).json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Get Order by ID
router.get('/:id', authMiddleware, validateObjectId(), handleValidationErrors, async (req, res) => {
    const { id } = req.params;
    try {
        const order = await Order.findById(id).populate('user').populate('items.product', 'name price images category');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if req.user exists
        if (!req.user) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // Check if the user is the owner of the order or an admin
        if (order.user._id.toString() !== req.user._id && order.user._id.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }
        res.json(order);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Update Order Status
router.put('/:id/status', authMiddleware, adminOnly, validateObjectId(), validateOrderStatusUpdate, handleValidationErrors, async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    try {
        const order = await Order.findByIdAndUpdate(id, { orderStatus: status.toLowerCase() }, { new: true });
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        res.json(order);
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Add/Update Shipment Details
router.put('/:id/shipment', authMiddleware, validateObjectId(), validateShipmentUpdate, handleValidationErrors, async (req, res) => {
    const { id } = req.params;
    const { awbNumber, courier, shipmentStatus, shipmentDate, expectedDeliveryDate, trackingUrl } = req.body;

    try {
        // Check if user is admin or logistics
        if (req.user.role !== 'admin' && req.user.role !== 'logistics') {
            return res.status(403).json({ message: 'Forbidden: Only admins or logistics team can update shipment details' });
        }

        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Validate that order is eligible for shipping (not cancelled or returned)
        if (['cancelled', 'returned'].includes(order.orderStatus)) {
            return res.status(400).json({ message: 'Cannot update shipment for cancelled or returned orders' });
        }

        // Update shipment details
        const shipmentUpdate = {};
        if (awbNumber !== undefined) shipmentUpdate['shipmentDetails.awbNumber'] = awbNumber;
        if (courier !== undefined) shipmentUpdate['shipmentDetails.courier'] = courier;
        if (shipmentStatus !== undefined) shipmentUpdate['shipmentDetails.shipmentStatus'] = shipmentStatus;
        if (shipmentDate !== undefined) shipmentUpdate['shipmentDetails.shipmentDate'] = new Date(shipmentDate);
        if (expectedDeliveryDate !== undefined) shipmentUpdate['shipmentDetails.expectedDeliveryDate'] = new Date(expectedDeliveryDate);
        if (trackingUrl !== undefined) shipmentUpdate['shipmentDetails.trackingUrl'] = trackingUrl;

        const updatedOrder = await Order.findByIdAndUpdate(id, shipmentUpdate, { new: true })
            .populate('user', 'name email');

        // Send email notification for shipment update
        try {
            await sendOrderNotification('shipment_updated', updatedOrder, updatedOrder.user.email);
        } catch (emailError) {
            console.error('Failed to send shipment update email:', emailError);
        }

        res.json({
            message: 'Shipment details updated successfully',
            order: updatedOrder
        });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

// Cancel Order
router.patch('/:id/cancel', authMiddleware, validateObjectId(), handleValidationErrors, async (req, res) => {
    const { id } = req.params;
    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user owns the order
        if (order.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        // Check if order can be cancelled (e.g., not shipped)
        if (['shipped', 'delivered', 'cancelled'].includes(order.orderStatus)) {
            return res.status(400).json({
                message: 'Order cannot be cancelled',
                currentStatus: order.orderStatus
            });
        }

        order.orderStatus = 'cancelled';
        order.cancelledAt = new Date();
        await order.save();

        // Send order cancellation email
        try {
            await sendOrderNotification('order_cancelled', order, req.user.email);
        } catch (emailError) {
            console.error('Failed to send order cancellation email:', emailError);
        }

        res.json({
            message: 'Order cancelled successfully',
            order: {
                _id: order._id,
                orderNumber: order.orderNumber,
                orderStatus: order.orderStatus,
                cancelledAt: order.cancelledAt,
                totalAmount: order.totalAmount
            }
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reorder
router.post('/:id/reorder', authMiddleware, validateObjectId(), handleValidationErrors, async (req, res) => {
    const { id } = req.params;
    try {
        const originalOrder = await Order.findById(id);
        if (!originalOrder) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user owns the order
        if (originalOrder.user.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }

        // Generate new order number
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8).toUpperCase();
        const orderNumber = `ORD-${timestamp}-${random}`;

        // Create new order with same details
        const newOrder = new Order({
            user: req.user.id,
            orderNumber,
            items: originalOrder.items,
            shippingAddress: originalOrder.shippingAddress,
            paymentMethod: originalOrder.paymentMethod,
            totalAmount: originalOrder.totalAmount
        });

        await newOrder.save();

        // Send reorder confirmation email
        try {
            await sendOrderNotification('order_reordered', newOrder, req.user.email);
        } catch (emailError) {
            console.error('Failed to send reorder confirmation email:', emailError);
        }

        res.status(201).json({
            message: 'Order reordered successfully',
            order: newOrder
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Manage Returns
router.post('/:id/return', authMiddleware, validateObjectId(), validateReturnRequest, handleValidationErrors, async (req, res) => {
    const { id } = req.params;
    const { reason, items } = req.body;
    try {
        const order = await Order.findById(id);
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        // Check if the user is the owner of the order
        if (order.user._id.toString() !== req.user.id) {
            return res.status(403).json({ message: 'Forbidden' });
        }
        // Logic for processing return
        order.orderStatus = 'returned';
        // You might want to add more logic here, like creating a ReturnRequest document
        await order.save();
        res.json({ message: 'Return processed successfully' });
    } catch (error) {
        res.status(400).json({ error: error.message });
    }
});

export default router;
