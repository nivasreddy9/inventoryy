import express from 'express';
import ReturnRequest from '../models/ReturnRequest.js';
import authMiddleware, { adminOnly } from '../middleware/authMiddleware.js';
import {
    validateObjectId,
    handleValidationErrors,
    validateReturnRequest
} from '../middleware/extendedValidation.js';

const router = express.Router();

// All routes require admin authentication
router.use(authMiddleware);
router.use(adminOnly);

/**
 * @route GET /api/admin/returns
 * @desc Get all return requests with pagination and filtering
 * @access Private (admin only)
 * @query {string} status - Filter by status
 * @query {string} type - Filter by type (return/replacement/exchange)
 * @query {number} page - Page number (default: 1)
 * @query {number} limit - Items per page (default: 10)
 * @query {string} sortBy - Sort field (default: createdAt)
 * @query {string} sortOrder - Sort order (asc/desc, default: desc)
 * @returns {object} Paginated return requests list
 */
router.get('/', async (req, res) => {
  try {
    const {
      status,
      type,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);
    const skip = (pageNum - 1) * limitNum;

    // Build filter query
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;

    // Build sort object
    const sortObj = {};
    sortObj[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const returnRequests = await ReturnRequest.find(filter)
      .populate('user', 'firstName lastName email')
      .populate('order', 'orderNumber totalAmount')
      .populate('items.product', 'name price images')
      .sort(sortObj)
      .skip(skip)
      .limit(limitNum)
      .lean();

    const total = await ReturnRequest.countDocuments(filter);
    const totalPages = Math.ceil(total / limitNum);

    res.json({
      success: true,
      message: 'Return requests retrieved successfully',
      data: {
        returnRequests,
        pagination: {
          currentPage: pageNum,
          totalPages,
          totalRequests: total,
          hasNextPage: pageNum < totalPages,
          hasPrevPage: pageNum > 1
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve return requests',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/returns/:id
 * @desc Get a specific return request by ID
 * @access Private (admin only)
 * @param {string} id - Return request ID
 * @returns {object} Return request details
 */
router.get('/:id', validateObjectId(), handleValidationErrors, async (req, res) => {
  try {
    const returnRequest = await ReturnRequest.findById(req.params.id)
      .populate('user', 'firstName lastName email phone')
      .populate('order', 'orderNumber totalAmount status createdAt')
      .populate('items.product', 'name price images sku')
      .populate('timeline.updatedBy', 'firstName lastName');

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    res.json({
      success: true,
      message: 'Return request retrieved successfully',
      data: returnRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve return request',
      error: error.message
    });
  }
});

/**
 * @route PUT /api/admin/returns/:id/status
 * @desc Update return request status
 * @access Private (admin only)
 * @param {string} id - Return request ID
 * @param {string} status - New status
 * @param {string} notes - Status update notes
 * @returns {object} Updated return request
 */
router.put('/:id/status', validateObjectId(), handleValidationErrors, async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes } = req.body;

    const validStatuses = [
      'pending', 'approved', 'processing', 'shipped',
      'received', 'inspected', 'completed', 'rejected', 'cancelled'
    ];

    if (!validStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid status provided'
      });
    }

    const returnRequest = await ReturnRequest.findById(id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    // Update status and add timeline entry
    await returnRequest.updateStatus(status, notes || 'Status updated by admin', req.user.id);

    // Populate the updated document
    await returnRequest.populate('user', 'firstName lastName email');
    await returnRequest.populate('order', 'orderNumber totalAmount');
    await returnRequest.populate('items.product', 'name price images');

    res.json({
      success: true,
      message: `Return request ${status} successfully`,
      data: returnRequest
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to update return request status',
      error: error.message
    });
  }
});

/**
 * @route DELETE /api/admin/returns/:id
 * @desc Delete a return request
 * @access Private (admin only)
 * @param {string} id - Return request ID
 * @returns {object} Success message
 */
router.delete('/:id', validateObjectId(), handleValidationErrors, async (req, res) => {
  try {
    const returnRequest = await ReturnRequest.findById(req.params.id);

    if (!returnRequest) {
      return res.status(404).json({
        success: false,
        message: 'Return request not found'
      });
    }

    await ReturnRequest.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Return request deleted successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to delete return request',
      error: error.message
    });
  }
});

/**
 * @route GET /api/admin/returns/stats/summary
 * @desc Get return requests statistics
 * @access Private (admin only)
 * @returns {object} Return requests statistics
 */
router.get('/stats/summary', async (req, res) => {
  try {
    const totalRequests = await ReturnRequest.countDocuments();
    const pendingRequests = await ReturnRequest.countDocuments({ status: 'pending' });
    const approvedRequests = await ReturnRequest.countDocuments({ status: 'approved' });
    const completedRequests = await ReturnRequest.countDocuments({ status: 'completed' });
    const rejectedRequests = await ReturnRequest.countDocuments({ status: 'rejected' });

    // Requests in the last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const recentRequests = await ReturnRequest.countDocuments({
      createdAt: { $gte: thirtyDaysAgo }
    });

    res.json({
      success: true,
      message: 'Return requests statistics retrieved successfully',
      data: {
        totalRequests,
        pendingRequests,
        approvedRequests,
        completedRequests,
        rejectedRequests,
        recentRequests
      }
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve return requests statistics',
      error: error.message
    });
  }
});

export default router;
