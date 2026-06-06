const mongoose = require('mongoose');
const AppError = require('../utils/AppError');

/**
 * Middleware للتحقق من إن ال ID في ال params هو ObjectId صحيح
 * 
 * بنستخدمه قبل ما نوصل لقاعدة البيانات، عشان نوفّر استعلام غير ضروري
 * 
 * استخدام:
 *   router.get('/:id', validateObjectId, getProduct);
 */
const validateObjectId = (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return next(new AppError(`Invalid ID: ${req.params.id}`, 400));
    }
    next();
};

module.exports = validateObjectId;