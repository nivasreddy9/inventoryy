import express from 'express';
import multer from 'multer';
import slugify from 'slugify';
import Product from '../models/Product.js';
import Category from '../models/Category.js';
import {
    validateProductCreation,
    validateProductUpdate,
    validateProductQuery,
    handleValidationErrors,
    validateObjectId,
} from '../middleware/extendedValidation.js';
import authMiddleware, { adminOnly } from '../middleware/authMiddleware.js';

const upload = multer({ storage: multer.memoryStorage(), limits: { files: 10 } });

const router = express.Router();

// Get all products with pagination and filtering
router.get('/', validateProductQuery, handleValidationErrors, async (req, res) => {
    try {
        const {
            page = 1,
            limit = 10,
            category,
            search,
            minPrice,
            maxPrice,
            sortBy = 'createdAt',
            sortOrder = 'desc'
        } = req.query;

        const filter = { isActive: true };

        if (category) {
            filter.category = category;
        }

        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } }
            ];
        }

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
        }

        const sortOptions = {};
        sortOptions[sortBy] = sortOrder === 'desc' ? -1 : 1;

        const products = await Product.find(filter)
            .populate('category', 'name slug')
            .populate('productType', 'name slug')
            .sort(sortOptions)
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Product.countDocuments(filter);

        res.json({
            products,
            totalPages: Math.ceil(total / limit),
            currentPage: parseInt(page),
            total
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single product
router.get('/:id', validateObjectId(), handleValidationErrors, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('category', 'name slug')
            .populate('productType', 'name slug')
            .populate('createdBy', 'firstName lastName email');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        res.json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Create product (admin only)
router.post('/', adminOnly, upload.array('images'), validateProductCreation, handleValidationErrors, async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'At least one image is required' });
        }

        const images = req.files.map(file => ({
            data: file.buffer,
            contentType: file.mimetype
        }));

        const productData = {
            ...req.body,
            images,
            createdBy: req.user.id
        };

        // Generate slug from name if not provided
        if (!productData.slug) {
            productData.slug = slugify(productData.name, { lower: true, strict: true });
        }

        const product = new Product(productData);

        await product.save();
        await product.populate('category', 'name slug');
        await product.populate('productType', 'name slug');

        res.status(201).json(product);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update product (admin only)
router.put('/:id', adminOnly, upload.array('images'), validateObjectId(), validateProductUpdate, handleValidationErrors, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if the user is the creator of the product or an admin
        if (product.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        const updateData = { ...req.body, updatedAt: Date.now() };

        if (req.files && req.files.length > 0) {
            updateData.images = req.files.map(file => ({
                data: file.buffer,
                contentType: file.mimetype
            }));
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true }
        ).populate('category', 'name slug').populate('productType', 'name slug');

        res.json(updatedProduct);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete product (admin only)
router.delete('/:id', adminOnly, validateObjectId(), handleValidationErrors, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if the user is the creator of the product or an admin
        if (product.createdBy.toString() !== req.user.id && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Forbidden' });
        }

        await Product.findByIdAndDelete(req.params.id);

        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get single product image by index
router.get('/:id/image/:index', validateObjectId(), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).select('images');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const index = parseInt(req.params.index, 10);
        if (isNaN(index) || index < 0 || index >= product.images.length) {
            return res.status(400).json({ message: 'Invalid image index' });
        }

        const image = product.images[index];
        res.set('Content-Type', image.contentType);
        res.send(image.data);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add images to existing product (admin only)
router.post('/:id/images', adminOnly, upload.array('images'), validateObjectId(), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'At least one image is required' });
        }

        const newImages = req.files.map(file => ({
            data: file.buffer,
            contentType: file.mimetype
        }));

        product.images.push(...newImages);
        await product.save();

        res.json({ message: 'Images added successfully', imagesCount: product.images.length });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Update product image by index (admin only)
router.put('/:id/image/:index', adminOnly, upload.single('image'), validateObjectId(), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const index = parseInt(req.params.index, 10);
        if (isNaN(index) || index < 0 || index >= product.images.length) {
            return res.status(400).json({ message: 'Invalid image index' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'Image is required' });
        }

        product.images[index] = {
            data: req.file.buffer,
            contentType: req.file.mimetype
        };

        await product.save();

        res.json({ message: 'Image updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Delete product image by index (admin only)
router.delete('/:id/image/:index', adminOnly, validateObjectId(), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const index = parseInt(req.params.index, 10);
        if (isNaN(index) || index < 0 || index >= product.images.length) {
            return res.status(400).json({ message: 'Invalid image index' });
        }

        product.images.splice(index, 1);
        await product.save();

        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get products by category
router.get('/category/:categorySlug', async (req, res) => {
    try {
        const category = await Category.findOne({ slug: req.params.categorySlug });

        if (!category) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const products = await Product.find({
            category: category._id,
            isActive: true
        }).populate('category', 'name slug').populate('productType', 'name slug');

        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get products by product type
router.get('/product-type/:productTypeId', validateObjectId(), async (req, res) => {
    try {
        const products = await Product.find({
            productType: req.params.productTypeId,
            isActive: true
        }).populate('category', 'name slug').populate('productType', 'name slug');

        res.json(products);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get similar products based on category and product type
router.get('/:id/similar', validateObjectId(), async (req, res) => {
    try {
        const product = await Product.findById(req.params.id).populate('category', 'name slug').populate('productType', 'name slug');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        const similarProducts = await Product.find({
            _id: { $ne: req.params.id },
            category: product.category._id,
            productType: product.productType._id,
            isActive: true
        }).populate('category', 'name slug').populate('productType', 'name slug').limit(10).sort({ createdAt: -1 });

        res.json(similarProducts);
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
