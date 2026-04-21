const db = require('./config/db');
const logger = require('./utils/logger');

async function initializeDatabase() {
    try {
        logger.info('Initializing database schema...');

        // 1. Create Users Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS users (
                id VARCHAR(36) PRIMARY KEY,
                username VARCHAR(255) NOT NULL UNIQUE,
                password VARCHAR(255) NOT NULL,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        logger.info('- Users table ready');

        // 2. Create Categories Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS categories (
                productCategoryId VARCHAR(36) PRIMARY KEY,
                productPath VARCHAR(255),
                productType VARCHAR(255),
                image_path TEXT,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        logger.info('- Categories table ready');

        // 3. Create Products Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS products (
                productId VARCHAR(36) PRIMARY KEY,
                productName VARCHAR(255) NOT NULL,
                productPrice BIGINT NOT NULL,
                productImage TEXT,
                productCategoryId VARCHAR(36),
                view_count INT DEFAULT 0,
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (productCategoryId) REFERENCES categories(productCategoryId) ON DELETE SET NULL
            )
        `);
        logger.info('- Products table ready');

        logger.info('Database initialization and migration completed successfully!');
        process.exit(0);
    } catch (error) {
        logger.error(`Database initialization failed: ${error.message}`);
        process.exit(1);
    }
}

initializeDatabase();
