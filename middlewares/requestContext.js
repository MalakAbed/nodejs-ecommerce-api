const { AsyncLocalStorage } = require('async_hooks');
const { v4: uuidv4 } = require('uuid');

// إنشاء instance واحدة مشتركة على مستوى التطبيق كله
const asyncLocalStorage = new AsyncLocalStorage();

/**
 * Middleware بيشغّل context جديد لكل request
 * بيولّد requestId فريد وبيخزّنه مع معلومات الـ request
 */
const requestContext = (req, res, next) => {
    const requestId = uuidv4();
    const startTime = Date.now();

    // نضيف requestId لـ response headers عشان الـ client يقدر يتتبّع طلبه
    res.setHeader('X-Request-Id', requestId);

    // نشغّل الـ context مع البيانات اللي بدنا نخزّنها
    asyncLocalStorage.run(
        {
            requestId,
            startTime,
            method: req.method,
            url: req.originalUrl,
        },
        () => next() // كل الكود اللي بعد هاد الـ next() رح يشوف الـ context
    );
};

/**
 * دالة مساعدة: أي كود في التطبيق يقدر يستدعيها
 * ليجيب الـ context تبع الـ request الحالي
 */
const getRequestContext = () => asyncLocalStorage.getStore();

module.exports = { requestContext, getRequestContext };