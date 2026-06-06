const mongoose = require('mongoose');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

/**
 * Resource-Based Authorization Middleware
 * بيتحقق إن الـ resource المطلوب يخص المستخدم الحالي
 *
 * @param {string} modelName - اسم الـ Mongoose model (مثلاً 'Order', 'Product')
 * @param {string} ownerField - اسم الحقل اللي بيحدد المالك في الـ model (مثلاً 'user')
 *
 * استخدام:
 *   router.get('/:id', protect, checkOwnership('Order', 'user'), getOrder);
 */
const checkOwnership = (modelName, ownerField = 'user') => {
    return catchAsync(async (req, res, next) => {
        // admins يقدروا يوصلوا لأي resource
        if (req.user?.isAdmin) {
            const Model = mongoose.model(modelName);

    const resource = await Model.findById(req.params.id);

    if (!resource) {
        return next(new AppError(`${modelName} not found`, 404));
    }

    req.resource = resource;
            return next();
        }

        // تحقق إن الـ ID صحيح
        if (!mongoose.isValidObjectId(req.params.id)) {
            return next(new AppError(`Invalid ID: ${req.params.id}`, 400));
        }

        // نجيب الـ Model ديناميكياً حسب الاسم
        const Model = mongoose.model(modelName);

        // نجيب الـ resource من قاعدة البيانات
        const resource = await Model.findById(req.params.id);

        if (!resource) {
            return next(new AppError(`${modelName} not found`, 404));
        }

        // نتحقق من الـ ownership
        const ownerId = resource[ownerField]?.toString();
        const currentUserId = req.user?.userID?.toString();

        if (!ownerId || !currentUserId) {
            return next(new AppError('Cannot verify resource ownership', 403));
        }

        if (ownerId !== currentUserId) {
            return next(
                new AppError('You do not have permission to access this resource', 403)
            );
        }

        // نحفظ الـ resource في req عشان الـ controller ما يجيبه مرة ثانية
        req.resource = resource;

        next();
    });
};

module.exports = checkOwnership;