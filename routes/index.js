const express = require('express');
const router = express.Router();

const productRoute = require('./products');
const categoriesRoute = require('./categories');
const userRoute = require('./users');
const orderRoute = require('./orders');

router.use('/products', productRoute);
router.use('/categories', categoriesRoute);
router.use('/users', userRoute);
router.use('/orders', orderRoute);

module.exports = router;