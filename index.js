const cors = require('cors');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
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
    app.use(helmet({
        crossOriginResourcePolicy: { policy: "cross-origin" }
    }));

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

    // Image resizing and optimization middleware for uploads
    app.get('/uploads/:filename', async (req, res, next) => {
        const { filename } = req.params;
        const { w, h } = req.query;

        const filePath = path.join(__dirname, 'uploads', filename);

        // If file doesn't exist locally, hand over to static or next middleware
        if (!fs.existsSync(filePath)) {
            return next();
        }

        // Check if it's an image
        const ext = path.extname(filename).toLowerCase();
        const isImage = ['.webp', '.jpg', '.jpeg', '.png', '.gif'].includes(ext);

        if ((!w && !h) || !isImage) {
            return res.sendFile(filePath);
        }

        try {
            const MAX_DIM = 2000;
            const width = w ? Math.min(parseInt(w, 10), MAX_DIM) : null;
            const height = h ? Math.min(parseInt(h, 10), MAX_DIM) : null;

            if ((w && isNaN(width)) || (h && isNaN(height))) {
                return res.sendFile(filePath);
            }

            // Cache lives outside uploads/ to prevent it being served by the static middleware
            const cacheDir = path.join(__dirname, 'image_cache');
            if (!fs.existsSync(cacheDir)) {
                fs.mkdirSync(cacheDir, { recursive: true });
            }

            // Generate cache filename: filename_wX_hY.ext
            const cacheFilename = `${path.basename(filename, ext)}_${width || 'auto'}x${height || 'auto'}${ext}`;
            const cacheFilePath = path.join(cacheDir, cacheFilename);

            if (fs.existsSync(cacheFilePath)) {
                res.set('Cache-Control', 'public, max-age=31536000, immutable');
                return res.sendFile(cacheFilePath);
            }

            // Perform resize
            let transform = sharp(filePath);
            transform = transform.resize({
                width: width || undefined,
                height: height || undefined,
                fit: 'inside',
                withoutEnlargement: true
            });

            // Set quality/format
            if (ext === '.webp') {
                transform = transform.webp({ quality: 80 });
            } else if (ext === '.jpg' || ext === '.jpeg') {
                transform = transform.jpeg({ quality: 80 });
            } else if (ext === '.png') {
                transform = transform.png({ quality: 80 });
            }

            await transform.toFile(cacheFilePath);
            res.set('Cache-Control', 'public, max-age=31536000, immutable');
            return res.sendFile(cacheFilePath);
        } catch (err) {
            logger.error(`Image resize failed for ${filename}: ${err.message}`);
            return res.sendFile(filePath);
        }
    });

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
    // General rate limiter: 500 requests per 5 minutes
    const generalLimiter = rateLimit({
        windowMs: 5 * 60 * 1000,
        limit: 500,
        standardHeaders: 'draft-7',
        legacyHeaders: false,
        message: { message: 'Too many requests from this IP, please try again after 5 minutes' }
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
