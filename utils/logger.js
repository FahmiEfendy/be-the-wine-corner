const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, colorize, errors } = format;

// Custom format for logs
const logFormat = printf(({ level, message, timestamp, stack }) => {
    return `${timestamp} [${level}]: ${stack || message}`;
});

const logger = createLogger({
    level: 'info', // Default level
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

// If we're not in production then log to the `console` with colors
if (process.env.NODE_ENV !== 'production') {
    logger.add(new transports.Console({
        format: combine(
            colorize(),
            logFormat
        )
    }));
}

module.exports = logger;
