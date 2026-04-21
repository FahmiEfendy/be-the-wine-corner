const express = require('express');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/db');
const logger = require('../utils/logger');
const upload = require('../utils/multer');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM categories');
        if (rows.length === 0) {
            return res.status(404).json({ message: 'No categories found' });
        }
        logger.info('Categories fetched successfully');
        res.json(rows);
    } catch (error) {
        logger.error(`Error fetching categories: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Add a category
router.post('/', verifyToken, upload.single('image_path'), async (req, res) => {
    const { productPath, productType } = req.body;
    const productCategoryId = uuidv4();

    // Use uploaded file path or provided URL
    const imagePath = req.file ? `uploads/${req.file.filename}` : (req.body.image_path || '');

    try {
        // Check for existing duplicates
        const [existing] = await db.execute(
            'SELECT * FROM categories WHERE productType = ? OR productPath = ?',
            [productType, productPath]
        );

        if (existing.length > 0) {
            const isTypeDup = existing.some(c => c.productType === productType);
            const msg = isTypeDup 
                ? `A category with the name "${productType}" already exists.` 
                : `A category with the path "${productPath}" already exists.`;
            return res.status(400).json({ message: msg });
        }

        await db.execute(
            'INSERT INTO categories (productCategoryId, productPath, productType, image_path) VALUES (?, ?, ?, ?)',
            [productCategoryId, productPath, productType, imagePath]
        );
        logger.info(`Category added successfully: ${productType} (${productCategoryId})`);
        res.status(201).json({ message: 'Category added successfully', productCategoryId });
    } catch (error) {
        logger.error(`Error adding category: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Update category (PATCH)
router.patch('/:id', verifyToken, upload.single('image_path'), async (req, res) => {
    const { productPath, productType } = req.body;
    let imagePath = req.body.image_path;

    if (req.file) {
        imagePath = `uploads/${req.file.filename}`;
    }

    try {
        // Fetch current values to allow partial updates if needed
        const [current] = await db.execute('SELECT * FROM categories WHERE productCategoryId = ?', [req.params.id]);
        if (current.length === 0) {
            return res.status(404).json({ message: 'Category not found' });
        }

        const updatedPath = productPath || current[0].productPath;
        const updatedType = productType || current[0].productType;
        const updatedImage = imagePath !== undefined ? imagePath : current[0].image_path;

        // Check for duplicates in other categories
        if (productType || productPath) {
            const [dups] = await db.execute(
                'SELECT * FROM categories WHERE (productType = ? OR productPath = ?) AND productCategoryId != ?',
                [updatedType, updatedPath, req.params.id]
            );

            if (dups.length > 0) {
                const isTypeDup = dups.some(c => c.productType === updatedType);
                const msg = isTypeDup 
                    ? `Another category already uses the name "${updatedType}".` 
                    : `Another category already uses the path "${updatedPath}".`;
                return res.status(400).json({ message: msg });
            }
        }

        await db.execute(
            'UPDATE categories SET productPath = ?, productType = ?, image_path = ? WHERE productCategoryId = ?',
            [updatedPath, updatedType, updatedImage, req.params.id]
        );

        logger.info(`Category updated successfully: ${req.params.id}`);
        res.json({ message: 'Category updated successfully' });
    } catch (error) {
        logger.error(`Error updating category ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
