const rateLimit = require('express-rate-limit');

// ─── دالة مساعدة لتوليد key مخصص ───────────────────────────────

/**
 * بتولّد مفتاح العدّاد بناءً على:
 * - الـ IP دايماً (أساس)
 * - الـ User ID لو موجود (أدق وأعدل)
 */
const keyByUserOrIP = (req) => {
    // لو المستخدم مسجّل دخول، نعدّ عليه مباشرة بغض النظر عن الـ IP
    if (req.user?.userID) {
        return `user_${req.user.userID}`;
    }
    // غير مسجّل → نرجع للـ IP
    return `ip_${req.ip}`;
};

// ─── 1. API Limiter العام (by IP) ────────────────────────────────
/**
 * حماية عامة لكل الـ API
 * 100 request / 15 دقيقة لكل IP
 */
const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    keyGenerator: (req) => `ip_${req.ip}`,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        message: 'Too many requests from this IP, please try again after 15 minutes'
    }
});

// ─── 2. Auth Limiter (by IP, صارم) ──────────────────────────────
/**
 * حماية من brute force على login
 * 5 محاولات / 15 دقيقة لكل IP
 */
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    keyGenerator: (req) => `ip_${req.ip}`,
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests: true,
    message: {
        status: 'fail',
        message: 'Too many login attempts, please try again after 15 minutes'
    }
});

// ─── 3. User Limiter (by User ID) ───────────────────────────────
/**
 * تحديد لكل مستخدم مسجّل بشكل منفصل
 * 200 request / 15 دقيقة لكل user
 * أعدل من الـ IP لأن كل user له عدّاده الخاص
 */
const userLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    keyGenerator: keyByUserOrIP,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        message: 'You have exceeded your request limit, please try again after 15 minutes'
    }
});

// ─── 4. Sensitive Endpoint Limiter ──────────────────────────────
/**
 * للـ endpoints الحسّاسة (POST, PUT, DELETE)
 * 30 request / 15 دقيقة لكل user أو IP
 * عشان نمنع spam أو abuse على العمليات اللي بتغيّر البيانات
 */
const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    keyGenerator: keyByUserOrIP,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        message: 'Too many write operations, please slow down'
    }
});

// ─── 5. Tenant Limiter (توضيحي) ─────────────────────────────────
/**
 * في تطبيقات SaaS: كل شركة/مؤسسة (tenant) عندها حد خاص
 * هون بنمثّل الـ tenant بالـ API key أو header مخصص
 *
 * ملاحظة: مشروعنا ما فيه tenants فعلياً، هاد تطبيق توضيحي
 * يبيّن كيف ينطبق المفهوم
 */
const tenantLimiter = rateLimit({
    windowMs: 60 * 60 * 1000, // ساعة كاملة
    max: 1000,
    keyGenerator: (req) => {
        // في SaaS حقيقي: بنقرأ الـ tenant من JWT أو API key أو subdomain
        // هون بنستخدم header توضيحي
        const tenantId = req.headers['x-tenant-id'] || 'default';
        return `tenant_${tenantId}`;
    },
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        status: 'fail',
        message: 'Tenant request limit exceeded for this hour'
    }
});

module.exports = {
    apiLimiter,
    authLimiter,
    userLimiter,
    sensitiveLimiter,
    tenantLimiter
};