const bcrypt = require('bcrypt');
const express = require('express');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const db = require('../config/db');
const logger = require('../utils/logger');
const verifyToken = require('../middleware/auth');

const router = express.Router();

// Register
router.post('/register', async (req, res) => {
    const { username, password } = req.body;
    const id = uuidv4();

    try {
        const [existingUser] = await db.execute('SELECT * FROM users WHERE username = ?', [username]);

        if (existingUser.length > 0) {
            logger.error(`Registration failed: Username already exists: ${username}`);
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
        logger.error(`Registration error for user ${username}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});

// Login
router.post('/login', async (req, res) => {
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
                logger.error(`Login failed: Invalid password for user: ${username}`);
                res.status(401).json({ message: 'Invalid credentials' });
            }
        } else {
            logger.error(`Login failed: No user found for: ${username}`);
            res.status(401).json({ message: 'No user found' });
        }
    } catch (error) {
        logger.error(`Login error for user ${username}: ${error.message}`);
        res.status(500).json({ error: error.message });
    }
});


// Verify Token
router.get('/verify', verifyToken, (req, res) => {
    res.json({ valid: true, user: req.user });
});

module.exports = router;
