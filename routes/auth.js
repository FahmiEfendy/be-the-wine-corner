const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/db');
const logger = require('../utils/logger');
const verifyToken = require('../middleware/auth');
const { registerValidator, loginValidator } = require('../middleware/validation');

const router = express.Router();

// Register
router.post('/register', registerValidator, async (req, res, next) => {
    const { username, password } = req.body;
    const id = uuidv4();

    try {
        const [existingUser] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

        if (existingUser.length > 0) {
            logger.warn(`Registration failed: Username already exists: ${username}`);
            return res.status(400).json({ message: 'Username already exists' });
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        await db.execute(
            'INSERT INTO users (id, username, password) VALUES (?, ?, ?)',
            [id, username, hashedPassword]
        );
        logger.info(`User registered successfully: ${username}`);
        res.status(201).json({ message: 'User registered successfully', userId: id });
    } catch (error) {
        next(error);
    }
});

// Login
router.post('/login', loginValidator, async (req, res, next) => {
    const { username, password } = req.body;

    try {
        const [rows] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

        if (rows.length > 0) {
            const user = rows[0];
            const isMatch = await bcrypt.compare(password, user.password);

            if (isMatch) {
                const token = jwt.sign(
                    { id: user.id, username: user.username },
                    process.env.JWT_TOKEN_KEY,
                    { expiresIn: process.env.JWT_TOKEN_EXPIRED }
                );

                logger.info(`Login successful: ${username}`);
                res.json({
                    message: 'Login successful',
                    token,
                    user: { id: user.id, username: user.username }
                });
            } else {
                logger.warn(`Login failed: Invalid password for user: ${username}`);
                res.status(401).json({ message: 'Invalid credentials' });
            }
        } else {
            logger.warn(`Login failed: No user found for: ${username}`);
            res.status(401).json({ message: 'Invalid credentials' }); // Standardize message to avoid user enumeration
        }
    } catch (error) {
        next(error);
    }
});

// Verify Token
router.get('/verify', verifyToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

module.exports = router;
