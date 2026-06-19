const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;

// Custom format for logs
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
    level: process.env.LOG_LEVEL || 'info', // Respect .env configuration
    format: combine(
        timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        errors({ stack: true }), // Capture stack trace for errors
        logFormat
    ),
    transports: [
        // Write all logs with level 'error' and below to 'error.log'
        new transports.File({ filename: 'logs/error.log', level: 'error' }),
        // Write all logs with level 'info' and below to 'combined.log'
        new transports.File({ filename: 'logs/combined.log' }),
    ],
});

// Log to the `console` with colors for all environments
logger.add(new transports.Console({
    format: combine(
        colorize(),
        logFormat
    )
}));

module.exports = logger;
