const AppError = require('../utils/AppError');

/**
 * Middleware للتحقق من صلاحيات المستخدم (role-based authorization)
 * 
 * استخدام:
 *   router.delete('/:id', restrictTo('admin'), deleteHandler);
 *   router.put('/profile', restrictTo('admin', 'user'), updateHandler);
 * 
 * هاد middleware لازم يجي بعد authentication (authJwt) لأنه بيعتمد على req.user
 */
const restrictTo = (...allowedRoles) => {
    return (req, res, next) => {
        // ال user info موجودة في req.user بفضل authJwt (express-jwt بيحطها هناك)
        if (!req.user) {
            return next(new AppError('You are not logged in', 401));
        }

        // تحديد role المستخدم
        const userRole = req.user.isAdmin ? 'admin' : 'user';

        if (!allowedRoles.includes(userRole)) {
            return next(new AppError('You do not have permission to perform this action', 403));
        }

        next();
    };
};

module.exports = restrictTo;