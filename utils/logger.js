const winston = require('winston');
const path = require('path');

// نستورد getRequestContext - بس لازم نتجنب circular dependency
// لهيك بنطلبه داخل الدالة مش في أعلى الملف
const getContext = () => {
    try {
        const { getRequestContext } = require('../middlewares/requestContext');
        return getRequestContext();
    } catch {
        return null;
    }
};

// Format مخصص بيضيف requestId لكل log
const addRequestContext = winston.format((info) => {
    const context = getContext();
    if (context?.requestId) {
        info.requestId = context.requestId;
        info.duration = context.startTime
            ? `${Date.now() - context.startTime}ms`
            : undefined;
    }
    return info;
});

const logFormat = winston.format.combine(
    addRequestContext(),
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.json()
);

const consoleFormat = winston.format.combine(
    addRequestContext(),
    winston.format.colorize(),
    winston.format.timestamp({ format: 'HH:mm:ss' }),
    winston.format.printf(({ timestamp, level, message, requestId, duration }) => {
        const reqInfo = requestId ? ` [${requestId.slice(0, 8)}]` : '';
        const dur = duration ? ` (${duration})` : '';
        return `${timestamp} [${level}]${reqInfo}${dur}: ${message}`;
    })
);

const logger = winston.createLogger({
    level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
    format: logFormat,
    transports: [
        new winston.transports.File({
            filename: path.join('logs', 'error.log'),
            level: 'error'
        }),
        new winston.transports.File({
            filename: path.join('logs', 'combined.log')
        }),
        new winston.transports.Console({
            format: consoleFormat
        })
    ]
});

module.exports = logger;