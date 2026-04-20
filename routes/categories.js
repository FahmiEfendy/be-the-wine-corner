const express = require('express');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/db');
const logger = require('../utils/logger');

const router = express.Router();

// Get all categories
router.get('/', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM categories');
        logger.info('Categories fetched successfully');
        res.json(rows);
    } catch (error) {
        logger.error(`Error fetching categories: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Add a category
router.post('/', async (req, res) => {
    const { productPath, productType } = req.body;
    const productCategoryId = uuidv4();
    try {
        await db.execute(
            'INSERT INTO categories (productCategoryId, productPath, productType) VALUES (?, ?, ?)',
            [productCategoryId, productPath, productType]
        );
        logger.info(`Category added successfully: ${productType} (${productCategoryId})`);
        res.status(201).json({ message: 'Category added successfully', productCategoryId });
    } catch (error) {
        logger.error(`Error adding category: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
