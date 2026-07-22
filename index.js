const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const morgan = require('morgan');
const express = require('express');
const bodyParser = require('body-parser');
const { rateLimit } = require('express-rate-limit');

const db = require('./config/db');
const logger = require('./utils/logger');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const initializeDatabase = require('./config/init-db');
const errorHandler = require('./middleware/errorHandler');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database before starting server
initializeDatabase().then(() => {
    // Trust proxy to receive client IP correctly through reverse proxy (Nginx)
    app.set('trust proxy', 1);

    // Security headers middleware
    app.use(helmet());

    // CORS configuration restricting origins
    const allowedOrigins = process.env.ALLOWED_ORIGINS
        ? process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim())
        : ['http://localhost:5173', 'http://localhost:3000'];

    app.use(cors({
        origin: (origin, callback) => {
            // Allow requests with no origin (like mobile apps, curl, or same-origin backend-to-backend)
            if (!origin || allowedOrigins.includes(origin) || process.env.NODE_ENV !== 'production') {
                callback(null, true);
            } else {
                callback(new Error('Not allowed by CORS'));
            }
        },
        credentials: true
    }));

    // Skip logging for health checks / ping endpoints to avoid log pollution in monitoring
    app.use(morgan(process.env.MORGAN_ENVIRONMENT || 'dev', {
        skip: (req, res) => req.originalUrl === '/health'
    }));

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Health check endpoint (placed before rate limiters to avoid blocking service monitoring)
    app.get('/health', async (req, res, next) => {
        try {
            // Check DB connection
            await db.query('SELECT 1');
            res.status(200).json({
                status: 'UP',
                database: 'connected',
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            next(err);
        }
    });

    // Rate Limiting
    // General rate limiter: 100 requests per 15 minutes
    const generalLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 100,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { message: 'Too many requests from this IP, please try again after 15 minutes' }
    });

    // Sensitive auth rate limiter: 15 requests per 15 minutes
    const authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000,
        limit: 15,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { message: 'Too many login or registration attempts, please try again after 15 minutes' }
    });

    app.use(generalLimiter);
    app.use('/auth', authLimiter);

    // Routes
    app.use('/auth', authRoutes);
    app.use('/products', productRoutes);
    app.use('/categories', categoryRoutes);

    app.get('/', (req, res) => {
        res.send('Welcome to The Wine Corner API');
    });

    // Centralized error handling middleware (must be registered last)
    app.use(errorHandler);

    const server = app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
    });

    // Graceful Shutdown
    const gracefulShutdown = (signal) => {
        logger.info(`Received ${signal}. Shutting down gracefully...`);
        
        // Stop accepting new connections
        server.close(() => {
            logger.info('HTTP server closed.');
            
            // Close database connections
            db.end()
                .then(() => {
                    logger.info('Database pool closed.');
                    process.exit(0);
                })
                .catch((err) => {
                    logger.error(`Error closing database pool: ${err.message}`);
                    process.exit(1);
                });
        });

        // Force exit after 10s timeout
        setTimeout(() => {
            logger.error('Could not close connections in time, forcefully shutting down.');
            process.exit(1);
        }, 10000);
    };

    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

}).catch(err => {
    logger.error(`Server failed to start due to database error: ${err.message}`);
    process.exit(1);
});
