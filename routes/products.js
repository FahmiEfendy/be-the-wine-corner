const express = require('express');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/db');
const logger = require('../utils/logger');

const router = express.Router();

// Get all products with filtering and sorting
router.get('/', async (req, res) => {
    const { search, categoryId, sortBy, order } = req.query;

    let query = 'SELECT * FROM products';
    let queryParams = [];
    let whereClauses = [];

    // Filtering
    if (search) {
        whereClauses.push('productName LIKE ?');
        queryParams.push(`%${search}%`);
    }
    if (categoryId) {
        whereClauses.push('productCategoryId = ?');
        queryParams.push(categoryId);
    }

    if (whereClauses.length > 0) {
        query += ' WHERE ' + whereClauses.join(' AND ');
    }

    // Sorting
    const validSortFields = ['productName', 'productPrice', 'createdAt'];
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'productName';
    const sortOrder = order && order.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

    query += ` ORDER BY ${sortField} ${sortOrder}`;

    try {
        const [rows] = await db.execute(query, queryParams);
        logger.info(`Products fetched successfully with filters: ${JSON.stringify(req.query)}`);
        res.json(rows);
    } catch (error) {
        logger.error(`Error fetching products: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Get product by ID
router.get('/:id', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products WHERE productId = ?', [req.params.id]);
        if (rows.length > 0) {
            logger.info(`Product fetched successfully: ${req.params.id}`);
            res.json(rows[0]);
        } else {
            logger.error(`Product not found: ${req.params.id}`);
            res.status(404).json({ message: 'Product not found' });
        }
    } catch (error) {
        logger.error(`Error fetching product ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Get products by category
router.get('/category/:categoryId', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products WHERE productCategoryId = ?', [req.params.categoryId]);
        logger.info(`Products for category ${req.params.categoryId} fetched successfully`);
        res.json(rows);
    } catch (error) {
        logger.error(`Error fetching products for category ${req.params.categoryId}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Add new product
router.post('/', async (req, res) => {
    const { productName, productPrice, productImage, productCategoryId } = req.body;
    const productId = uuidv4();

    try {
        await db.execute(
            'INSERT INTO products (productId, productName, productPrice, productImage, productCategoryId) VALUES (?, ?, ?, ?, ?)',
            [productId, productName, productPrice, productImage, productCategoryId]
        );
        logger.info(`Product added successfully: ${productName} (${productId})`);
        res.status(201).json({ message: 'Product added successfully', productId });
    } catch (error) {
        logger.error(`Error adding product ${productName}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Update product
router.put('/:id', async (req, res) => {
    const { productName, productPrice, productImage, productCategoryId } = req.body;
    try {
        await db.execute(
            'UPDATE products SET productName = ?, productPrice = ?, productImage = ?, productCategoryId = ? WHERE productId = ?',
            [productName, productPrice, productImage, productCategoryId, req.params.id]
        );
        logger.info(`Product updated successfully: ${req.params.id}`);
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        logger.error(`Error updating product ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Delete product
router.delete('/:id', async (req, res) => {
    try {
        await db.execute('DELETE FROM products WHERE productId = ?', [req.params.id]);
        logger.info(`Product deleted successfully: ${req.params.id}`);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        logger.error(`Error deleting product ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
