const mysql = require('mysql2/promise');
const logger = require('../utils/logger');

require('dotenv').config();

async function initializeDatabase() {
    try {
        logger.info('Starting database setup...');

        // 1. Create connection without specifying database to create it if it doesn't exist
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
        });

        await connection.query(`CREATE DATABASE IF NOT EXISTS \`${process.env.DB_NAME}\`;`);
        logger.info(`- Database '${process.env.DB_NAME}' is ready`);
        await connection.end();

        // 2. Reconnect to the specific database to create tables
        const db = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
        });

        logger.info('Initializing table schema...');

        // Create Users Table
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

        // Create Categories Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS categories (
                productCategoryId VARCHAR(36) PRIMARY KEY,
                productPath VARCHAR(255),
                productType VARCHAR(255),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
            )
        `);
        logger.info('- Categories table ready');

        // Create Products Table
        await db.execute(`
            CREATE TABLE IF NOT EXISTS products (
                productId VARCHAR(36) PRIMARY KEY,
                productName VARCHAR(255) NOT NULL,
                productPrice BIGINT NOT NULL,
                productImage TEXT,
                productCategoryId VARCHAR(36),
                createdAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updatedAt TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                FOREIGN KEY (productCategoryId) REFERENCES categories(productCategoryId) ON DELETE SET NULL
            )
        `);
        logger.info('- Products table ready');

        await db.end();
        logger.info('Database initialization completed successfully!');
        return true;
    } catch (error) {
        logger.error(`Database initialization failed: ${error.message}`);
        throw error;
    }
}

// If run directly via 'node init-db.js'
if (require.main === module) {
    initializeDatabase()
        .then(() => process.exit(0))
        .catch(() => process.exit(1));
}

module.exports = initializeDatabase;
