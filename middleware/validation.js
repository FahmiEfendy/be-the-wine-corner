const { body, param, query, validationResult } = require('express-validator');

/**
 * Generic middleware to handle validation results.
 * If errors exist, returns a 400 Bad Request with the structured errors.
 */
const handleValidationErrors = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }
    next();
};

/**
 * Validation rules for user registration.
 */
const registerValidator = [
    body('username')
        .isString().withMessage('Username must be a string')
        .trim()
        .isLength({ min: 3, max: 50 }).withMessage('Username must be between 3 and 50 characters')
        .matches(/^[a-zA-Z0-9_-]+$/).withMessage('Username can only contain alphanumeric characters, underscores, and hyphens'),
    body('password')
        .isString().withMessage('Password must be a string')
        .isLength({ min: 6, max: 100 }).withMessage('Password must be between 6 and 100 characters'),
    handleValidationErrors
];

/**
 * Validation rules for user login.
 */
const loginValidator = [
    body('username')
        .isString().withMessage('Username must be a string')
        .trim()
        .notEmpty().withMessage('Username is required'),
    body('password')
        .isString().withMessage('Password must be a string')
        .notEmpty().withMessage('Password is required'),
    handleValidationErrors
];

/**
 * Validation rules for creating a category.
 */
const createCategoryValidator = [
    body('productPath')
        .isString().withMessage('Product path must be a string')
        .trim()
        .notEmpty().withMessage('Product path is required')
        .matches(/^[a-z0-9-]+$/).withMessage('Product path must be a URL-safe lowercase slug (alphanumeric and hyphens only)'),
    body('productType')
        .isString().withMessage('Product type/name must be a string')
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Product type/name must be between 2 and 100 characters'),
    handleValidationErrors
];

/**
 * Validation rules for updating a category (PATCH).
 */
const updateCategoryValidator = [
    body('productPath')
        .optional()
        .isString().withMessage('Product path must be a string')
        .trim()
        .matches(/^[a-z0-9-]+$/).withMessage('Product path must be a URL-safe lowercase slug (alphanumeric and hyphens only)'),
    body('productType')
        .optional()
        .isString().withMessage('Product type/name must be a string')
        .trim()
        .isLength({ min: 2, max: 100 }).withMessage('Product type/name must be between 2 and 100 characters'),
    handleValidationErrors
];

/**
 * Validation rules for products (POST & PUT).
 */
const productValidator = [
    body('productName')
        .isString().withMessage('Product name must be a string')
        .trim()
        .isLength({ min: 2, max: 200 }).withMessage('Product name must be between 2 and 200 characters'),
    body('productPrice')
        .customSanitizer(val => {
            // Price might come in as a string, sanitize to float
            const parsed = parseFloat(val);
            return isNaN(parsed) ? val : parsed;
        })
        .isFloat({ min: 0 }).withMessage('Product price must be a non-negative number'),
    body('productCategoryId')
        .optional({ checkFalsy: true })
        .isUUID().withMessage('Product category ID must be a valid UUID'),
    handleValidationErrors
];

/**
 * Validation rules for validating UUID parameter (e.g. :id).
 */
const uuidParamValidator = (paramName = 'id') => [
    param(paramName)
        .isUUID().withMessage(`Parameter '${paramName}' must be a valid UUID`),
    handleValidationErrors
];

/**
 * Validation rules for click tracking (type parameter must be allowed).
 */
const clickTypeParamValidator = [
    param('type')
        .isIn(['whatsapp', 'blibli', 'tokopedia']).withMessage('Click type must be one of: whatsapp, blibli, tokopedia'),
    handleValidationErrors
];

/**
 * Validation rules for product listing query parameters.
 */
const productQueryValidator = [
    query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer').toInt(),
    query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be a positive integer up to 100').toInt(),
    query('minPrice').optional().isFloat({ min: 0 }).withMessage('minPrice must be a non-negative number').toFloat(),
    query('maxPrice').optional().isFloat({ min: 0 }).withMessage('maxPrice must be a non-negative number').toFloat(),
    handleValidationErrors
];

module.exports = {
    registerValidator,
    loginValidator,
    createCategoryValidator,
    updateCategoryValidator,
    productValidator,
    uuidParamValidator,
    clickTypeParamValidator,
    productQueryValidator,
};
