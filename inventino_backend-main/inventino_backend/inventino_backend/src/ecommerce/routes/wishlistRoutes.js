import express from 'express';
import Wishlist from '../models/Wishlist.js';
import Product from '../models/Product.js';
import Cart from '../models/Cart.js';
import {
    validateWishlistItem,
    handleValidationErrors,
    validateObjectId,
} from '../middleware/extendedValidation.js';
import authMiddleware from '../middleware/authMiddleware.js';

const router = express.Router();

// Get user's wishlist
router.get('/', authMiddleware, async (req, res) => {
    try {
        const wishlist = await Wishlist.findOne({ user: req.user._id })
            .populate({
                path: 'products.product',
                select: 'name price images category stock isActive description brand rating',
                populate: {
                    path: 'category',
                    select: 'name slug'
                }
            });

        if (!wishlist) {
            return res.json({
                user: req.user.id,
                products: [],
                totalItems: 0
            });
        }

        // Filter out inactive products and return only active ones
        const activeProducts = wishlist.products.filter(item =>
            item.product && item.product.isActive
        );

        res.json({
            user: wishlist.user,
            products: activeProducts,
            totalItems: activeProducts.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Add product to wishlist
router.post('/', authMiddleware, validateWishlistItem, handleValidationErrors, async (req, res) => {
    try {
        const { productId } = req.body;

        // Check if product exists and is active
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        if (!product.isActive) {
            return res.status(400).json({ message: 'Product is not available' });
        }

        // Find or create wishlist for user
        let wishlist = await Wishlist.findOne({ user: req.user._id });

        if (!wishlist) {
            wishlist = new Wishlist({
                user: req.user._id,
                products: []
            });
        }

        // Check if product already exists in wishlist
        const existingProductIndex = wishlist.products.findIndex(
            item => item.product.toString() === productId
        );

        if (existingProductIndex > -1) {
            return res.status(400).json({ message: 'Product already in wishlist' });
        }

        // Add product to wishlist
        wishlist.products.push({
            product: productId,
            addedAt: new Date()
        });

        await wishlist.save();
        await wishlist.populate({
            path: 'products.product',
            select: 'name price images category stock isActive description brand rating',
            populate: {
                path: 'category',
                select: 'name slug'
            }
        });

        res.status(201).json({
            message: 'Product added to wishlist',
            wishlist: {
                user: wishlist.user,
                products: wishlist.products,
                totalItems: wishlist.products.length
            }
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Remove product from wishlist
router.delete('/:productId', authMiddleware, validateObjectId('productId'), handleValidationErrors, async (req, res) => {
    try {
        const { productId } = req.params;

        const wishlist = await Wishlist.findOne({ user: req.user._id });
        console.log('Delete product from wishlist for userId:', req.user._id, 'productId:', productId, 'wishlist found:', !!wishlist);

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        // Find product in wishlist
        const productIndex = wishlist.products.findIndex(
            item => item.product.toString() === productId
        );

        if (productIndex === -1) {
            return res.status(404).json({ message: 'Product not found in wishlist' });
        }

        // Remove product from wishlist
        wishlist.products.splice(productIndex, 1);
        await wishlist.save();

        res.json({
            message: 'Product removed from wishlist',
            totalItems: wishlist.products.length
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Clear entire wishlist
router.delete('/', authMiddleware, async (req, res) => {
    try {
        const wishlist = await Wishlist.findOneAndUpdate(
            { user: req.user._id },
            { $set: { products: [] } },
            { new: true }
        );

        if (!wishlist) {
            return res.status(404).json({ message: 'Wishlist not found' });
        }

        res.json({
            message: 'Wishlist cleared successfully',
            totalItems: 0
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Direct add product to cart
router.post('/:productId/add-to-cart', authMiddleware, validateObjectId('productId'), handleValidationErrors, async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id;

        // Find product details
        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return res.status(404).json({ message: 'Product not found or inactive' });
        }

        // Find or create user's cart
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({
                user: userId,
                items: [],
                totalAmount: 0
            });
        }

        // Check if product already in cart
        const cartItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );
        if (cartItemIndex > -1) {
            return res.status(400).json({ message: 'Product already in cart' });
        }

        // Add product to cart with quantity 1 and price
        cart.items.push({
            product: productId,
            quantity: 1,
            price: product.price,
            addedAt: new Date()
        });

        // Update total amount
        cart.totalAmount = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        cart.lastUpdated = new Date();

        // Save cart
        await cart.save();

        res.json({
            message: 'Product added to cart',
            cart
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Buy now - add product to cart and remove from wishlist if present
router.post('/:productId/buy-now', authMiddleware, validateObjectId('productId'), handleValidationErrors, async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id;
        console.log('Buy-now called for userId:', userId, 'productId:', productId);

        // Find product details
        const product = await Product.findById(productId);
        if (!product || !product.isActive) {
            return res.status(404).json({ message: 'Product not found or inactive' });
        }

        // Find or create user's cart
        let cart = await Cart.findOne({ user: userId });
        if (!cart) {
            cart = new Cart({
                user: userId,
                items: [],
                totalAmount: 0
            });
        }

        // Check if product already in cart
        const cartItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );
        if (cartItemIndex > -1) {
            return res.status(400).json({ message: 'Product already in cart' });
        }

        // Add product to cart with quantity 1 and price
        cart.items.push({
            product: productId,
            quantity: 1,
            price: product.price,
            addedAt: new Date()
        });

        // Update total amount
        cart.totalAmount = cart.items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        cart.lastUpdated = new Date();

        // Save cart
        await cart.save();

        // Find user's wishlist and remove product if present
        const wishlist = await Wishlist.findOne({ user: userId });
        let productRemoved = false;
        if (wishlist) {
            const productIndex = wishlist.products.findIndex(
                item => item.product.toString() === productId
            );
            if (productIndex > -1) {
                wishlist.products.splice(productIndex, 1);
                await wishlist.save();
                productRemoved = true;
            }
        }

        res.json({
            message: productRemoved ? 'Product purchased and removed from wishlist' : 'Product purchased',
            cart,
            wishlistRemoved: productRemoved
        });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

export default router;
