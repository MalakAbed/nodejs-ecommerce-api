const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const router = express.Router();

const User = require('../models/User');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');

const restrictTo = require('../middlewares/restrictTo');
const validateObjectId = require('../middlewares/validateObjectId');

const { userLimiter, sensitiveLimiter, authLimiter } = require('../middlewares/rateLimiter');


// GET all users
router.get('/', userLimiter, catchAsync(async (req, res, next) => {
    const userList = await User.find().select('-passwordHash');

    if (!userList) {
        return next(new AppError('Could not fetch users', 500));
    }

    res.status(200).json({
        status: 'success',
        results: userList.length,
        data: userList
    });
}));

// GET user by ID
router.get('/:id', validateObjectId, catchAsync(async (req, res, next) => {
    const user = await User.findById(req.params.id).select('-passwordHash');

    if (!user) {
        return next(new AppError('User with the given ID not found', 404));
    }

    res.status(200).json({
        status: 'success',
        data: user
    });
}));

// POST register
router.post('/register', catchAsync(async (req, res, next) => {
    let user = new User({
        name: req.body.name,
        email: req.body.email,
        passwordHash: bcrypt.hashSync(req.body.password, 10),
        phone: req.body.phone,
        isAdmin: req.body.isAdmin,
        street: req.body.street,
        apartment: req.body.apartment,
        zip: req.body.zip,
        city: req.body.city,
        country: req.body.country
    });

    user = await user.save();

    if (!user) {
        return next(new AppError('User cannot be created', 400));
    }

    res.status(201).json({
        status: 'success',
        data: user
    });
}));

// POST login
router.post('/login', authLimiter, catchAsync(async (req, res, next) => {
    const user = await User.findOne({ email: req.body.email });
    const secret = process.env.secret;

    if (!user) {
        return next(new AppError('User with given Email not found', 400));
    }

    if (!bcrypt.compareSync(req.body.password, user.passwordHash)) {
        return next(new AppError('Password is incorrect', 400));
    }

    const token = jwt.sign({
        userID: user.id,
        isAdmin: user.isAdmin
    }, secret, { expiresIn: '1d' });

    res.status(200).json({
        status: 'success',
        user: user.email,
        token: token
    });
}));

// DELETE user
router.delete('/:id', sensitiveLimiter, validateObjectId, restrictTo('admin'), catchAsync(async (req, res, next) => {
    const user = await User.findByIdAndRemove(req.params.id);

    if (!user) {
        return next(new AppError('User not found', 404));
    }

    res.status(200).json({
        status: 'success',
        message: 'User deleted successfully'
    });
}));

// GET user count
router.get('/get/count', catchAsync(async (req, res, next) => {
    const userCount = await User.countDocuments();

    if (userCount === undefined || userCount === null) {
        return next(new AppError('Could not get user count', 500));
    }

    res.status(200).json({
        status: 'success',
        userCount: userCount
    });
}));

module.exports = router;