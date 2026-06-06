const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const multer = require('multer');

const Product = require('../models/product');
const Category = require('../models/category');

const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { sensitiveLimiter } = require('../middlewares/rateLimiter');

const cacheMiddleware = require('../middlewares/cacheMiddleware');
const { deleteCache } = require('../utils/cache');

const FILE_TYPE_MAP = {
    'image/png': 'png',
    'image/jpeg': 'jpeg',
    'image/jpg': 'jpg',


}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const isValid = FILE_TYPE_MAP[file.mimetype];
        let uploadError = new Error('Invalid Image Type');
        if(isValid){
            uploadError = null
        }
        cb(uploadError, 'public/uploads')
    },
    filename: function (req, file, cb) {
        const fileName = file.originalname.replace(/\s/g, '-');
        const extension = FILE_TYPE_MAP[file.mimetype];
        cb(null, `${fileName}-${Date.now()}.${extension}`)
    }
})

const upload  = multer({ storage: storage })

router.get('/', cacheMiddleware(60), catchAsync(async (req, res, next) => {
    let filter = {};
    if (req.query.categories) {
        filter = { category: req.query.categories.split(',') };
    }

    const productList = await Product.find(filter).populate('category');
    
    if (!productList) {
        return next(new AppError('Could not fetch products', 500));
    }
    
    res.status(200).json({
        status: 'success',
        results: productList.length,
        data: productList
    });
}));

router.get('/:id', catchAsync(async (req, res, next) => {
    const product = await Product.findById(req.params.id).populate('category');

    if (!product) {
        return next(new AppError('Product with the given ID not found', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: product
    });
}));

router.post('/', sensitiveLimiter, upload.single('image'), catchAsync(async (req, res, next) => {
    const category = await Category.findById(req.body.category);
    if (!category) {
        return next(new AppError('Invalid Category', 400));
    }

    const file = req.file;
    if (!file) {
        return next(new AppError('No image in the request', 400));
    }

    const fileName = file.filename;
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;

    let product = new Product({
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        image: `${basePath}${fileName}`,
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured
    });

    product = await product.save();

    if (!product) {
        return next(new AppError('Product cannot be created', 500));
    }

    // امسح الـ cache عشان الـ GET يجيب البيانات الجديدة
    deleteCache('cache_/api/v1/products');

    res.status(201).json({
        status: 'success',
        data: product
    });
}));

router.put('/:id', sensitiveLimiter, catchAsync(async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return next(new AppError('Invalid Product ID', 400));
    }

    const category = await Category.findById(req.body.category);
    if (!category) {
        return next(new AppError('Invalid Category', 400));
    }

    const product = await Product.findByIdAndUpdate(req.params.id, {
        name: req.body.name,
        description: req.body.description,
        richDescription: req.body.richDescription,
        image: req.body.image,
        brand: req.body.brand,
        price: req.body.price,
        category: req.body.category,
        countInStock: req.body.countInStock,
        rating: req.body.rating,
        numReviews: req.body.numReviews,
        isFeatured: req.body.isFeatured
    }, { new: true });

    if (!product) {
        return next(new AppError('Product not found', 404));
    }
    

    // امسح الـ cache 
    deleteCache('cache_/api/v1/products');

    res.status(200).json({
        status: 'success',
        data: product
    });
}));

router.delete('/:id', sensitiveLimiter, catchAsync(async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return next(new AppError('Invalid Product ID', 400));
    }

    const product = await Product.findByIdAndRemove(req.params.id);
    
    if (!product) {
        return next(new AppError('Product not found', 404));
    }
    

    // امسح الـ cache 
    deleteCache('cache_/api/v1/products');

    res.status(200).json({
        status: 'success',
        message: 'Product deleted successfully'
    });
}));

router.get('/get/count', catchAsync(async (req, res, next) => {
    const productCount = await Product.countDocuments();
    
    if (productCount === undefined || productCount === null) {
        return next(new AppError('Could not get product count', 500));
    }
    
    res.status(200).json({
        status: 'success',
        productCount: productCount
    });
}));

router.get('/get/featured/:count', catchAsync(async (req, res, next) => {
    const count = req.params.count ? req.params.count : 0;
    const products = await Product.find({ isFeatured: true }).limit(+count);
    
    if (!products) {
        return next(new AppError('Could not get featured products', 500));
    }
    
    res.status(200).json({
        status: 'success',
        results: products.length,
        data: products
    });
}));

router.put('/gallery-images/:id', upload.array('images', 10), catchAsync(async (req, res, next) => {
    if (!mongoose.isValidObjectId(req.params.id)) {
        return next(new AppError('Invalid Product ID', 400));
    }

    const files = req.files;
    let imagesPaths = [];
    const basePath = `${req.protocol}://${req.get('host')}/public/uploads/`;
    
    if (files) {
        files.map(file => {
            imagesPaths.push(`${basePath}${file.filename}`);
        });
    }

    const product = await Product.findByIdAndUpdate(req.params.id, {
        images: imagesPaths,
    }, { new: true });

    if (!product) {
        return next(new AppError('Product not found', 404));
    }
    
    res.status(200).json({
        status: 'success',
        data: product
    });
}));

module.exports = router;