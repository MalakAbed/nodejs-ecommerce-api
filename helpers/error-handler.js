const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// معالج للأخطاء من Mongoose (مثلاً لما ال ID غلط)
const handleCastErrorDB = (err) => {
    const message = `Invalid ${err.path}: ${err.value}`;
    return new AppError(message, 400);
};

// معالج لأخطاء ال duplicate key (مثلاً email مكرر)
const handleDuplicateFieldsDB = (err) => {
    const value = err.errmsg.match(/(["'])(\\?.)*?\1/)[0];
    const message = `Duplicate field value: ${value}. Please use another value.`;
    return new AppError(message, 400);
};

// معالج لأخطاء الvalidation من Mongoose 
const handleValidationErrorDB = (err) => {
    const errors = Object.values(err.errors).map((el) => el.message);
    const message = `Invalid input data. ${errors.join('. ')}`;
    return new AppError(message, 400);
};
const handlePayloadTooLarge = () => {
    return new AppError('Request body too large. Maximum size allowed is 10kb', 413);
};
// معالج رئيسي
function errorHandler(err, req, res, next) {
    err.statusCode = err.statusCode || 500;
    err.status = err.status || 'error';

    // معالجة أخطاء express-jwt القديمة
    if (err.name === 'UnauthorizedError') {
        return res.status(401).json({
            status: 'fail',
            message: 'The user is not authorized'
        });
    }

    // نسخة من الايرور عشان ما نعدل الأصلي
    let error = { ...err, message: err.message, name: err.name };

    // تحويل أخطاء Mongooseل AppError
    if (error.name === 'CastError') error = handleCastErrorDB(error);
    if (error.code === 11000) error = handleDuplicateFieldsDB(error);
    if (error.name === 'ValidationError') error = handleValidationErrorDB(error);
    
    // Express errors
    if (error.type === 'entity.too.large') error = handlePayloadTooLarge();

    // الرد النهائي
    if (error.isOperational) {
        // أخطاء متوقعة (رميناها بأنفسنا) <- نكشف الرسالة
        return res.status(error.statusCode).json({
            status: error.status,
            message: error.message
        });
    }

    // أخطاء غير متوقعة (bugs) -> ما نكشف تفاصيل
    logger.error('UNEXPECTED ERROR', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method
});
    return res.status(500).json({
        status: 'error',
        message: 'Something went wrong'
    });
}


module.exports = errorHandler;