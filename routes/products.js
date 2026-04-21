const express = require('express');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/db');
const logger = require('../utils/logger');
const upload = require('../utils/multer');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// Get all products with filtering, sorting, and pagination
router.get('/', async (req, res) => {
    const { search, categoryId, sortBy, order, page = 1, limit = 9, seed, minPrice, maxPrice } = req.query;

    const offset = (page - 1) * limit;
    let query = 'SELECT * FROM products';
    let countQuery = 'SELECT COUNT(*) as total FROM products';
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
    if (minPrice) {
        whereClauses.push('productPrice >= ?');
        queryParams.push(parseInt(minPrice));
    }
    if (maxPrice) {
        whereClauses.push('productPrice <= ?');
        queryParams.push(parseInt(maxPrice));
    }

    if (whereClauses.length > 0) {
        const whereString = ' WHERE ' + whereClauses.join(' AND ');
        query += whereString;
        countQuery += whereString;
    }

    // Handle seeded random sorting
    if (sortBy === 'random' && seed) {
        // In MySQL, RAND(seed) provides a deterministic random sequence
        query += ` ORDER BY RAND(${db.escape(seed)})`;
    } else if (sortBy) {
        const validSortFields = ['productName', 'productPrice', 'createdAt', 'view_count', 'whatsapp_clicks', 'blibli_clicks', 'tokopedia_clicks'];
        const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt';
        const sortOrder = order && order.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
        query += ` ORDER BY ${sortField} ${sortOrder}, productId ASC`;
    } else {
        query += ' ORDER BY productName ASC, productId ASC';
    }

    // Pagination
    query += ' LIMIT ? OFFSET ?';
    const paginatedParams = [...queryParams, parseInt(limit), parseInt(offset)];

    try {
        const [rows] = await db.execute(query, paginatedParams);
        const [countResult] = await db.execute(countQuery, queryParams);

        const total = countResult[0].total;
        const lastPage = Math.ceil(total / limit);

        logger.info(`Products fetched successfully. Total: ${total}, Page: ${page}`);

        res.json({
            data: rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                lastPage
            }
        });
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
router.post('/', verifyToken, upload.single('productImage'), async (req, res) => {
    const { productName, productPrice, productCategoryId } = req.body;
    const productId = uuidv4();

    // Use uploaded file path or provided URL
    const productImagePath = req.file ? `uploads/${req.file.filename}` : (req.body.productImage || '');

    try {
        await db.execute(
            'INSERT INTO products (productId, productName, productPrice, productImage, productCategoryId) VALUES (?, ?, ?, ?, ?)',
            [productId, productName, productPrice, productImagePath, productCategoryId]
        );
        logger.info(`Product added successfully: ${productName} (${productId})`);
        res.status(201).json({ message: 'Product added successfully', productId });
    } catch (error) {
        logger.error(`Error adding product ${productName}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Update product
router.put('/:id', verifyToken, upload.single('productImage'), async (req, res) => {
    const { productName, productPrice, productCategoryId } = req.body;

    // Keep old image or use new one
    let productImagePath = req.body.productImage;
    if (req.file) {
        productImagePath = `uploads/${req.file.filename}`;
    }

    try {
        const [rows] = await db.execute('SELECT productId FROM products WHERE productId = ?', [req.params.id]);
        if (rows.length === 0) {
            logger.error(`Update failed: Product not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Product not found' });
        }

        await db.execute(
            'UPDATE products SET productName = ?, productPrice = ?, productImage = ?, productCategoryId = ? WHERE productId = ?',
            [productName, productPrice, productImagePath, productCategoryId, req.params.id]
        );
        logger.info(`Product updated successfully: ${req.params.id}`);
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        logger.error(`Error updating product ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Delete product
router.delete('/:id', verifyToken, async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT productId FROM products WHERE productId = ?', [req.params.id]);
        if (rows.length === 0) {
            logger.error(`Delete failed: Product not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Product not found' });
        }

        await db.execute('DELETE FROM products WHERE productId = ?', [req.params.id]);
        logger.info(`Product deleted successfully: ${req.params.id}`);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        logger.error(`Error deleting product ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Increment view count
router.patch('/:id/view', async (req, res) => {
    try {
        const [rows] = await db.execute('SELECT productId FROM products WHERE productId = ?', [req.params.id]);
        if (rows.length === 0) {
            logger.error(`Delete failed: Product not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Product not found' });
        }

        await db.execute('UPDATE products SET view_count = view_count + 1 WHERE productId = ?', [req.params.id]);
        res.json({ message: 'View count updated' });
    } catch (error) {
        logger.error(`Error updating view count ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Increment click counts for marketplace/whatsapp
router.patch('/:id/click/:type', async (req, res) => {
    const { type } = req.params;
    const allowedTypes = ['whatsapp', 'blibli', 'tokopedia'];
    
    if (!allowedTypes.includes(type)) {
        return res.status(400).json({ error: 'Invalid click type' });
    }

    const columnName = `${type}_clicks`;

    try {
        const [rows] = await db.execute('SELECT productId FROM products WHERE productId = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await db.execute(`UPDATE products SET ${columnName} = ${columnName} + 1 WHERE productId = ?`, [req.params.id]);
        res.json({ message: `${type} click updated` });
    } catch (error) {
        logger.error(`Error updating ${type} clicks for ${req.params.id}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
