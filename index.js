const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const express = require('express');
const bodyParser = require('body-parser');

const db = require('./config/db');
const logger = require('./utils/logger');
const authRoutes = require('./routes/auth');
const productRoutes = require('./routes/products');
const categoryRoutes = require('./routes/categories');
const initializeDatabase = require('./config/init-db');

require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Initialize Database before starting server
initializeDatabase().then(() => {
    // Middleware
    app.use(cors());

    // Skip logging for health checks / ping endpoints to avoid log pollution in monitoring
    app.use(morgan(process.env.MORGAN_ENVIRONMENT || 'dev', {
        skip: (req, res) => req.originalUrl === '/api/health'
    }));

    app.use(bodyParser.json());
    app.use(bodyParser.urlencoded({ extended: true }));

    app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

    // Routes
    app.get('/api/health', async (req, res) => {
        try {
            // Check DB connection
            await db.query('SELECT 1');
            res.status(200).json({
                status: 'UP',
                database: 'connected',
                timestamp: new Date().toISOString()
            });
        } catch (err) {
            res.status(500).json({
                status: 'DOWN',
                database: 'disconnected',
                error: err.message,
                timestamp: new Date().toISOString()
            });
        }
    });

    app.use('/api/auth', authRoutes);
    app.use('/api/products', productRoutes);
    app.use('/api/categories', categoryRoutes);

    app.get('/api', (req, res) => {
        res.send('Welcome to The Wine Corner API');
    });

    app.listen(PORT, () => {
        logger.info(`Server is running on port ${PORT}`);
    });
}).catch(err => {
    logger.error(`Server failed to start due to database error: ${err.message}`);
    process.exit(1);
});

