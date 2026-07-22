const express = require('express');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/db');
const logger = require('../utils/logger');
const upload = require('../utils/multer');
const verifyToken = require('../middleware/auth');
const {
    productValidator,
    uuidParamValidator,
    clickTypeParamValidator,
    productQueryValidator
} = require('../middleware/validation');

const router = express.Router();

// Get all products with filtering, sorting, and pagination
router.get('/', productQueryValidator, async (req, res, next) => {
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
    if (minPrice !== undefined && !isNaN(Number(minPrice))) {
        whereClauses.push('productPrice >= ?');
        queryParams.push(Number(minPrice));
    }
    if (maxPrice !== undefined && !isNaN(Number(maxPrice))) {
        whereClauses.push('productPrice <= ?');
        queryParams.push(Number(maxPrice));
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
    const finalLimit = Number(limit) || 9;
    const finalOffset = Number(offset) || 0;
    
    query += ' LIMIT ? OFFSET ?';
    const paginatedParams = [...queryParams, finalLimit, finalOffset];

    try {
        const [rows] = await db.query(query, paginatedParams);
        const [countResult] = await db.execute(countQuery, queryParams);

        const total = countResult[0].total;
        const lastPage = Math.ceil(total / finalLimit);

        logger.info(`Products fetched successfully. Total: ${total}, Page: ${page}`);

        const responseData = {
            data: rows,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(finalLimit),
                lastPage
            }
        };

        if (rows.length === 0) {
            responseData.message = "Our wine cellar is currently being updated. No products found matching your criteria.";
        }

        res.json(responseData);
    } catch (error) {
        next(error);
    }
});

// Get product by ID
router.get('/:id', uuidParamValidator('id'), async (req, res, next) => {
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
        next(error);
    }
});

// Get products by category
router.get('/category/:categoryId', uuidParamValidator('categoryId'), async (req, res, next) => {
    try {
        const [rows] = await db.execute('SELECT * FROM products WHERE productCategoryId = ?', [req.params.categoryId]);
        logger.info(`Products for category ${req.params.categoryId} fetched successfully`);
        res.json(rows);
    } catch (error) {
        next(error);
    }
});

// Add new product
router.post('/', verifyToken, upload.single('productImage'), productValidator, async (req, res, next) => {
    const { productName, productPrice, productCategoryId } = req.body;
    const productId = uuidv4();

    // Use uploaded file path or provided URL
    const productImagePath = req.file ? `uploads/${req.file.filename}` : (req.body.productImage || '');

    try {
        // Validate category existence if provided
        if (productCategoryId) {
            const [catCheck] = await db.execute('SELECT * FROM categories WHERE productCategoryId = ?', [productCategoryId]);
            if (catCheck.length === 0) {
                return res.status(404).json({ message: 'The specified category does not exist. Please create the category first.' });
            }
        }

        await db.execute(
            'INSERT INTO products (productId, productName, productPrice, productImage, productCategoryId) VALUES (?, ?, ?, ?, ?)',
            [productId, productName, productPrice, productImagePath, productCategoryId]
        );
        logger.info(`Product added successfully: ${productName} (${productId})`);
        res.status(201).json({ message: 'Product added successfully', productId });
    } catch (error) {
        next(error);
    }
});

// Update product
router.put('/:id', verifyToken, upload.single('productImage'), uuidParamValidator('id'), productValidator, async (req, res, next) => {
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

        // Validate category existence if provided
        if (productCategoryId) {
            const [catCheck] = await db.execute('SELECT * FROM categories WHERE productCategoryId = ?', [productCategoryId]);
            if (catCheck.length === 0) {
                return res.status(404).json({ message: 'The specified category does not exist. Please create the category first.' });
            }
        }

        await db.execute(
            'UPDATE products SET productName = ?, productPrice = ?, productImage = ?, productCategoryId = ? WHERE productId = ?',
            [productName, productPrice, productImagePath, productCategoryId, req.params.id]
        );
        logger.info(`Product updated successfully: ${req.params.id}`);
        res.json({ message: 'Product updated successfully' });
    } catch (error) {
        next(error);
    }
});

// Delete product
router.delete('/:id', verifyToken, uuidParamValidator('id'), async (req, res, next) => {
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
        next(error);
    }
});

// Increment view count
router.patch('/:id/view', uuidParamValidator('id'), async (req, res, next) => {
    try {
        const [rows] = await db.execute('SELECT productId FROM products WHERE productId = ?', [req.params.id]);
        if (rows.length === 0) {
            logger.error(`View increment failed: Product not found: ${req.params.id}`);
            return res.status(404).json({ message: 'Product not found' });
        }

        await db.execute('UPDATE products SET view_count = view_count + 1 WHERE productId = ?', [req.params.id]);
        res.json({ message: 'View count updated' });
    } catch (error) {
        next(error);
    }
});

// Increment click counts for marketplace/whatsapp
router.patch('/:id/click/:type', uuidParamValidator('id'), clickTypeParamValidator, async (req, res, next) => {
    const { type } = req.params;
    const columnName = `${type}_clicks`;

    try {
        const [rows] = await db.execute('SELECT productId FROM products WHERE productId = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ message: 'Product not found' });
        }

        await db.execute(`UPDATE products SET ${columnName} = ${columnName} + 1 WHERE productId = ?`, [req.params.id]);
        res.json({ message: `${type} click updated` });
    } catch (error) {
        next(error);
    }
});

module.exports = router;
