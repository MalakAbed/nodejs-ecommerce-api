// بياخد دالة وبيرجع دالة جديدة (higher-order function)
// الدالة الجديدة هي ال middleware اللي Express رح يستدعيها
// بنشغل الكونترولر الاصلي، ولو رمى اي ايرور، catch(next) بيمرر الايرور لexpress اللي بدوره بيبعته للglobal error handler
const catchAsync = (fn) => {
    return (req, res, next) => {
        fn(req, res, next).catch(next); 
    };
};

module.exports = catchAsync;