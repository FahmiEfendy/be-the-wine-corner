const logger = require('../utils/logger');

/**
 * Centralized error handling middleware.
 * Handles any thrown or passed errors gracefully.
 */
const errorHandler = (err, req, res, next) => {
    // Log the error using the custom logger with the full stack trace
    logger.error(`API Error: ${err.message}`, { stack: err.stack });

    // If headers have already been sent, delegate to the default Express error handler
    if (res.headersSent) {
        return next(err);
    }

    const statusCode = err.statusCode || 500;
    const response = {
        message: err.message || 'An unexpected error occurred',
    };

    // Include stack trace only in development/non-production environments
    if (process.env.NODE_ENV !== 'production') {
        response.stack = err.stack;
    }

    res.status(statusCode).json(response);
};

module.exports = errorHandler;
