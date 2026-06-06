
// كلاس مخصص للاخطاء المتوقعة (مثلاً يوزر مش موجود، invalid input)

class AppError extends Error {
    constructor(message, statusCode) {
        super(message);
        
        this.statusCode = statusCode;
        //  لو الكود بيبدا ب4 -> 'fail' (المشكلة من المستخدم)
        // غير هيك (500, 503) -> 'error' (المشكلة من السيرفر)
        this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

        // لتمييز الايرورز المتوقعة (انا رميتها)
        this.isOperational = true; // رح نستخدمه في ال error handler
        // بنحذف ال AppError نفسها من الـ stack trace عشان stack أنظف لما نعمل debug.
        Error.captureStackTrace(this, this.constructor);
    }
}

module.exports = AppError;