import express from 'express';
import slugify from 'slugify';
import ProductType from '../models/ProductType.js';
import Product from '../models/Product.js';
import {
  validateObjectId,
  validateProductTypeCreation,
  validateProductTypeUpdate,
  handleValidationErrors
} from '../middleware/extendedValidation.js';
import authMiddleware, { adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all product types
router.get('/', async (req, res) => {
  try {
    const productTypes = await ProductType.find({ isActive: true }).populate('category', 'name slug');
    res.json(productTypes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get product type by ID
router.get('/:id', validateObjectId(), handleValidationErrors, async (req, res) => {
  try {
    const productType = await ProductType.findById(req.params.id).populate('category', 'name slug');
    if (!productType) {
      return res.status(404).json({ message: 'Product type not found' });
    }
    res.json(productType);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new product type
router.post('/', authMiddleware, validateProductTypeCreation, handleValidationErrors, async (req, res) => {
  try {
    const { name, description, category } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    const existing = await ProductType.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: 'Product type with this name already exists' });
    }

    const productType = new ProductType({
      name,
      slug,
      description,
      category,
      createdBy: req.user.id
    });

    await productType.save();
    res.status(201).json(productType);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update product type
router.put('/:id', authMiddleware, validateObjectId(), validateProductTypeUpdate, handleValidationErrors, async (req, res) => {
  try {
    const productType = await ProductType.findById(req.params.id);
    if (!productType) {
      return res.status(404).json({ message: 'Product type not found' });
    }

    if (productType.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updateData = { ...req.body };
    if (updateData.name) {
      updateData.slug = slugify(updateData.name, { lower: true, strict: true });
    }

    const updatedProductType = await ProductType.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedProductType);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete product type
router.delete('/:id', authMiddleware, adminOnly, validateObjectId(), async (req, res) => {
  try {
    const productType = await ProductType.findById(req.params.id);
    if (!productType) {
      return res.status(404).json({ message: 'Product type not found' });
    }

    await ProductType.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product type deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get products by product type
router.get('/:id/products', validateObjectId(), async (req, res) => {
  try {
    const productType = await ProductType.findById(req.params.id);
    if (!productType) {
      return res.status(404).json({ message: 'Product type not found' });
    }

    const products = await Product.find({ productType: productType._id, isActive: true }).populate('category', 'name slug');
    res.json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
