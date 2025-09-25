import { body, validationResult, param, query } from 'express-validator';
import Category from '../models/Category.js';

// Helper function to handle validation errors
export const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

// User registration validation
export const validateUserRegistration = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
    .isLength({ max: 255 }).withMessage('Email must be less than 255 characters'),

  body('password')
    .isLength({ min: 6, max: 128 }).withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('First name can only contain letters and spaces'),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Last name can only contain letters and spaces'),

  body('phone')
    .optional()
    .isMobilePhone('any').withMessage('Please provide a valid phone number')
    .isLength({ max: 20 }).withMessage('Phone number must be less than 20 characters')
];

// User login validation
export const validateUserLogin = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
];

// Update profile validation
export const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('First name can only contain letters and spaces'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Last name can only contain letters and spaces'),

  body('phone')
    .optional()
    .isMobilePhone('any').withMessage('Please provide a valid phone number')
    .isLength({ max: 20 }).withMessage('Phone number must be less than 20 characters'),

  body('email')
    .optional()
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// Email validation
export const validateEmail = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail()
];

// Password reset validation
export const validatePasswordReset = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('newPassword')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
  .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
  .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

// Address validation
export const validateAddress = [
  body('type')
    .optional()
    .isIn(['home', 'work', 'other']).withMessage('Address type must be home, work, or other'),

  body('street')
    .optional()
    .trim()
    .isLength({ min: 5, max: 200 }).withMessage('Street address must be between 5 and 200 characters'),

  body('city')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('City must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('City can only contain letters and spaces'),

  body('state')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('State must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('State can only contain letters and spaces'),

  body('zipCode')
    .optional()
    .isPostalCode('any').withMessage('Please provide a valid zip/postal code'),

  body('country')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Country must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Country can only contain letters and spaces')
];

// MongoDB ObjectId validation
export const validateObjectId = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage(`Invalid ${paramName} format`)
];

// Pagination validation
export const validatePagination = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100')
];

  
// Custom validator to check if category exists in DB
const categoryExists = async (categoryId) => {
  const category = await Category.findById(categoryId);
  if (!category) {
    throw new Error('Category does not exist');
  }
};

export const validateProductCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 200 })
    .withMessage('Product name must be between 2 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Product name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('description')
    .trim()
    .isLength({ min: 10, max: 5000 })
    .withMessage('Description must be between 10 and 5000 characters'),
  
  body('price')
    .isFloat({ min: 0.01, max: 100000 })
    .withMessage('Price must be between 0.01 and 100,000'),

  body('productType')
    .isMongoId()
    .withMessage('Please provide a valid product type ID'),

  body('stock')
    .isInt({ min: 0, max: 100000 })
    .withMessage('Stock must be a positive integer between 0 and 100,000'),
  

  
  body('brand')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Brand must be between 2 and 100 characters'),
  
  body('weight')
    .optional()
    .isObject().withMessage('Weight must be an object with value and unit')
    .custom((value) => {
      if (!value.value || typeof value.value !== 'number' || value.value < 0 || value.value > 10000) {
        throw new Error('Weight value must be a number between 0 and 10,000');
      }
      if (!value.unit || typeof value.unit !== 'string' || !['g', 'kg', 'lb', 'oz'].includes(value.unit)) {
        throw new Error('Weight unit must be one of: g, kg, lb, oz');
      }
      return true;
    }),
  
  body('dimensions')
    .optional()
    .isObject().withMessage('Dimensions must be an object'),
  
  body('dimensions.length')
    .optional()
    .isFloat({ min: 0, max: 1000 }).withMessage('Length must be between 0 and 1000'),
  
  body('dimensions.width')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Width must be between 0 and 1000'),
  
  body('dimensions.height')
    .optional()
    .isFloat({ min: 0, max: 1000 })
    .withMessage('Height must be between 0 and 1000')
];

// Product update validation
export const validateProductUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 200 }).withMessage('Product name must be between 2 and 200 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/).withMessage('Product name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 5000 }).withMessage('Description must be between 10 and 5000 characters'),
  
  body('price')
    .optional()
    .isFloat({ min: 0.01, max: 100000 }).withMessage('Price must be between 0.01 and 100,000'),
  
  body('category')
    .optional()
    .isMongoId().withMessage('Please provide a valid category ID'),
  
  body('stock')
    .optional()
    .isInt({ min: 0, max: 100000 }).withMessage('Stock must be a positive integer between 0 and 100,000'),
  

];

// Product query validation
export const validateProductQuery = [
  query('page')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Page must be between 1 and 100'),
  
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid category ID'),
  
  query('search')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 }).withMessage('Maximum price must be a positive number')
    .custom((value, { req }) => {
      if (req.query.minPrice && parseFloat(value) <= parseFloat(req.query.minPrice)) {
        throw new Error('Maximum price must be greater than minimum price');
      }
      return true;
    }),
  
  query('sortBy')
    .optional()
    .isIn(['name', 'price', 'createdAt', 'updatedAt', 'stock'])
    .withMessage('Sort by must be one of: name, price, createdAt, updatedAt, stock'),
  
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be either asc or desc')
];

// Category validation rules
export const validateCategoryCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Category name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('slug')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Slug must be between 2 and 100 characters')
    .isSlug()
    .withMessage('Slug must be URL-friendly'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Parent category must be a valid category ID'),
  
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a positive integer'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Category update validation
export const validateCategoryUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Category name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Category name can only contain letters, numbers, spaces, hyphens, and underscores'),
  
  body('slug')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Slug must be between 2 and 100 characters')
    .isSlug()
    .withMessage('Slug must be URL-friendly'),
  
  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Description must be between 10 and 1000 characters'),
  
  body('parent')
    .optional()
    .isMongoId()
    .withMessage('Parent category must be a valid category ID'),
  
  body('sortOrder')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Sort order must be a positive integer'),
  
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

// Order validation rules
export const validateOrderCreation = [
  body('user')
    .isMongoId()
    .withMessage('User ID must be a valid MongoDB ID'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must contain at least one item'),
  
  body('items.*.product')
    .isMongoId()
    .withMessage('Each item must have a valid product ID'),
  
  body('items.*.quantity')
    .isInt({ min: 1, max: 1000 })
    .withMessage('Quantity must be between 1 and 1000'),
  
  body('items.*.price')
    .isFloat({ min: 0.01 })
    .withMessage('Price must be a positive number'),
  
  body('shippingAddress')
    .isObject()
    .withMessage('Shipping address is required'),
  
  body('shippingAddress.street')
    .trim()
    .isLength({ min: 5, max: 200 })
    .withMessage('Street address must be between 5 and 200 characters'),
  
  body('shippingAddress.city')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('City must be between 2 and 50 characters'),
  
  body('shippingAddress.state')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('State must be between 2 and 50 characters'),
  
  body('shippingAddress.zipCode')
    .isPostalCode('any')
    .withMessage('Please provide a valid zip/postal code'),
  
  body('shippingAddress.country')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Country must be between 2 and 50 characters'),
  
  body('paymentMethod')
    .isIn(['credit_card', 'debit_card', 'paypal', 'stripe', 'cod'])
    .withMessage('Payment method must be one of: credit_card, debit_card, paypal, stripe, cod')
];

// Order status update validation
export const validateOrderStatusUpdate = [
  body('status')
    .isIn(['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'returned'])
    .withMessage('Status must be one of: pending, processing, shipped, delivered, cancelled, returned')
];

// Vendor validation rules
export const validateVendorRegistration = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),
  
  body('password')
    .isLength({ min: 6, max: 128 })
    .withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  
  body('companyName')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Company name must be between 2 and 100 characters')
    .matches(/^[a-zA-Z0-9\s\-_&]+$/)
    .withMessage('Company name can only contain letters, numbers, spaces, hyphens, underscores, and ampersands'),
  
  body('businessName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Business name must be between 2 and 100 characters'),
  
  body('phone')
    .optional()
    .isMobilePhone('any')
    .withMessage('Please provide a valid phone number'),
  
  body('address')
    .optional()
    .isObject()
    .withMessage('Address must be an object')
];

// Search validation rules
export const validateSearchQuery = [
  query('q')
    .trim()
    .isLength({ min: 2, max: 100 })
    .withMessage('Search query must be between 2 and 100 characters'),
  
  query('type')
    .optional()
    .isIn(['products', 'categories', 'vendors'])
    .withMessage('Search type must be one of: products, categories, vendors'),
  
  query('category')
    .optional()
    .isMongoId()
    .withMessage('Category must be a valid category ID'),
  
  query('minPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum price must be a positive number'),
  
  query('maxPrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum price must be a positive number'),
  
  query('sort')
    .optional()
    .isIn(['relevance', 'price', 'newest', 'rating']).withMessage('Sort must be one of: relevance, price, newest, rating')
];

// Cart validation rules
export const validateCartItem = [
  body('productId')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ID'),
  
  body('quantity')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be between 1 and 100')
];

// Review validation rules
export const validateReview = [
  body('product')
    .isMongoId()
    .withMessage('Product ID must be a valid MongoDB ID'),

  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comment')
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters')
];

// Review update validation
export const validateReviewUpdate = [
  body('rating')
    .optional()
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),

  body('comment')
    .optional()
    .trim()
    .isLength({ min: 10, max: 1000 })
    .withMessage('Comment must be between 10 and 1000 characters')
];

// Return request validation
export const validateReturnRequest = [
  body('orderId')
    .isMongoId()
    .withMessage('Order ID must be a valid MongoDB ID'),
  
  body('reason')
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Return reason must be between 10 and 500 characters'),
  
  body('items')
    .isArray({ min: 1 })
    .withMessage('At least one item must be specified for return'),
  
  body('items.*.productId')
    .isMongoId()
    .withMessage('Each item must have a valid product ID'),
  
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1')
];

// Admin registration validation
export const validateAdminRegistration = [
  body('email')
    .isEmail().withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6, max: 128 }).withMessage('Password must be between 6 and 128 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/).withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('First name can only contain letters and spaces'),
  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 }).withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/).withMessage('Last name can only contain letters and spaces'),
];

// Product type creation validation
export const validateProductTypeCreation = [
  body('name')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Product type name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Product type name can only contain letters, numbers, spaces, hyphens, and underscores'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),

  body('category')
    .isMongoId()
    .withMessage('Please provide a valid category ID')
];

// Product type update validation
export const validateProductTypeUpdate = [
  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Product type name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z0-9\s\-_]+$/)
    .withMessage('Product type name can only contain letters, numbers, spaces, hyphens, and underscores'),

  body('description')
    .optional()
    .trim()
    .isLength({ min: 10, max: 500 })
    .withMessage('Description must be between 10 and 500 characters'),

  body('category')
    .optional()
    .isMongoId()
    .withMessage('Please provide a valid category ID')
];

// Review validation rules
// Removed duplicate declarations to fix redeclaration errors

// Shipment update validation
export const validateShipmentUpdate = [
  body('status')
    .isIn(['pending', 'shipped', 'delivered', 'cancelled'])
    .withMessage('Status must be one of: pending, shipped, delivered, cancelled'),
  
  body('trackingNumber')
    .optional()
    .trim()
    .isLength({ min: 5, max: 50 })
    .withMessage('Tracking number must be between 5 and 50 characters'),
  
  body('carrier')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Carrier must be between 2 and 50 characters')
];
