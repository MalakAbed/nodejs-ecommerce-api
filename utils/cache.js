/**
 * Simple In-Memory Cache
 *
 * في production الحقيقي: نستخدم Redis
 * هون: Map بسيطة للتوضيح والتعلم
 */

const cache = new Map();

/**
 * بيخزّن قيمة في الـ cache مع وقت انتهاء
 * @param {string} key - مفتاح الـ cache
 * @param {any} value - القيمة المخزّنة
 * @param {number} ttl - وقت الصلاحية بالثواني (افتراضي: 60 ثانية)
 */
const setCache = (key, value, ttl = 60) => {
    const expiresAt = Date.now() + ttl * 1000;
    cache.set(key, { value, expiresAt });
};

/**
 * بيجيب قيمة من الـ cache
 * بيرجع null لو ما موجودة أو انتهت صلاحيتها
 */
const getCache = (key) => {
    const item = cache.get(key);

    if (!item) return null;

    // تحقق من انتهاء الصلاحية
    if (Date.now() > item.expiresAt) {
        cache.delete(key);
        return null;
    }

    return item.value;
};

/**
 * بيمسح مفتاح محدد أو كل الـ cache
 */
const deleteCache = (key) => {
    if (key) {
        cache.delete(key);
    } else {
        cache.clear();
    }
};

/**
 * بيرجع معلومات عن الـ cache (مفيد للـ debugging)
 */
const getCacheStats = () => {
    return {
        size: cache.size,
        keys: [...cache.keys()]
    };
};

module.exports = { setCache, getCache, deleteCache, getCacheStats };