const { getCache, setCache } = require('../utils/cache');
const logger = require('../utils/logger');

/**
 * Cache Middleware
 * بيتحقق إذا في نسخة cached من الـ response
 * لو في → يرجّعها مباشرة بدون ما يكمل للـ controller
 * لو ما في → يكمل للـ controller ويخزّن الـ response
 *
 * @param {number} ttl - وقت الصلاحية بالثواني
 *
 * استخدام:
 *   router.get('/', cacheMiddleware(60), getAllProducts);
 */
const cacheMiddleware = (ttl = 60) => {
    return (req, res, next) => {
        // ما نعمل cache للـ authenticated requests المختلفة
        // الـ key بيشمل الـ URL والـ query params
        const cacheKey = `cache_${req.originalUrl}`;

        const cachedData = getCache(cacheKey);

        if (cachedData) {
            logger.info(`Cache HIT: ${req.originalUrl}`);

            // نرجّع البيانات من الـ cache مع header يوضح المصدر
            return res.status(200)
                .set('X-Cache', 'HIT')
                .json(cachedData);
        }

        logger.info(`Cache MISS: ${req.originalUrl}`);

        // نحفظ reference للـ json method الأصلية
        const originalJson = res.json.bind(res);

        // نعمل override للـ json method عشان نلتقط الـ response
        res.json = (data) => {
            // نخزّن الـ response في الـ cache
            setCache(cacheKey, data, ttl);

            // نضيف header يوضح إن البيانات جديدة
            res.set('X-Cache', 'MISS');

            // نستدعي الـ json الأصلية
            return originalJson(data);
        };

        next();
    };
};

module.exports = cacheMiddleware;