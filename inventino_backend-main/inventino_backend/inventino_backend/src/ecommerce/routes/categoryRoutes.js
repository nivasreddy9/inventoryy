import express from 'express';
import slugify from 'slugify';
import Category from '../models/Category.js';
import {
  validateObjectId,
  validateCategoryCreation,
  validateCategoryUpdate,
  handleValidationErrors
} from '../middleware/extendedValidation.js';
import authMiddleware, { adminOnly } from '../middleware/authMiddleware.js';

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
  try {
    const categories = await Category.find({ isActive: true }).populate('productTypes', 'name slug');
    res.json(categories);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get category by ID
router.get('/:id', validateObjectId(), handleValidationErrors, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('productTypes', 'name slug');
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Create new category
router.post('/', authMiddleware, validateCategoryCreation, handleValidationErrors, async (req, res) => {
  try {
    const { name, description, image, parentCategory } = req.body;
    const slug = slugify(name, { lower: true, strict: true });

    const existing = await Category.findOne({ slug });
    if (existing) {
      return res.status(400).json({ message: 'Category with this name already exists' });
    }

    const category = new Category({
      name,
      slug,
      description,
      image,
      parentCategory,
      createdBy: req.user.id
    });

    await category.save();
    res.status(201).json(category);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Update category
router.put('/:id', authMiddleware, validateObjectId(), validateCategoryUpdate, handleValidationErrors, async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    if (category.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const updateData = { ...req.body };
    if (updateData.name) {
      updateData.slug = slugify(updateData.name, { lower: true, strict: true });
    }

    const updatedCategory = await Category.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(updatedCategory);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Delete category
router.delete('/:id', authMiddleware, adminOnly, validateObjectId(), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }

    await Category.findByIdAndDelete(req.params.id);
    res.json({ message: 'Category deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Get product types in a category
router.get('/:id/product-types', validateObjectId(), async (req, res) => {
  try {
    const category = await Category.findById(req.params.id).populate('productTypes');
    if (!category) {
      return res.status(404).json({ message: 'Category not found' });
    }
    res.json(category.productTypes);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

export default router;
