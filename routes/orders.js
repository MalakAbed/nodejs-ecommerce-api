const express = require('express');
const router = express.Router();

const Order = require('../models/order');
const OrderItem = require('../models/order-item');

const checkOwnership = require('../middlewares/checkOwnership');
const AppError = require('../utils/AppError');
const catchAsync = require('../utils/catchAsync');
const { userLimiter, sensitiveLimiter, tenantLimiter } = require('../middlewares/rateLimiter');

router.get('/', tenantLimiter, userLimiter, async (req, res) => {
    const orderList = await Order.find()
    .populate('user' ,'name').sort({'dateOrdered':-1})
    .populate({ 
        path: 'orderItems', populate: { 
            path: 'product', populate: 'category'}
    });

    if (!orderList) {
        res.status(500).json({ success: false })
    }
    res.send(orderList)
})

router.get('/:id', userLimiter, checkOwnership('Order', 'user'), catchAsync(async (req, res, next) => {
  // نستخدم req.resource اللي حفظه checkOwnership بدل استعلام جديد
    const order = req.resource;
    
    if (!order) {
        return next(new AppError('Order not found', 404));
    }
    res.status(200).json({
        status: 'success',
        data: order
    });
}));

router.post('/', sensitiveLimiter, async (req, res) => {
   
    const orderItemsIds = Promise.all(req.body.orderItems.map( async (orderItem) => {
        let newOrderItem = new OrderItem({
            quantity: orderItem.quantity,
            product: orderItem.product
        })

        newOrderItem = await newOrderItem.save();

        return newOrderItem._id;
    }))

    const orderItemsIdsResolved = await orderItemsIds;

    const totalPrices = await Promise.all(orderItemsIdsResolved.map(async (orderItemId) => {
        const orderItem = await OrderItem.findById(orderItemId).populate('product', 'price')
        const totalPrice = orderItem.product.price * orderItem.quantity;
        return totalPrice
    }))

    const totalPrice = totalPrices.reduce((a, b) => a+ b , 0 );

    let order = new Order({
        orderItems: orderItemsIdsResolved,
        shippingAddress1: req.body.shippingAddress1,
        shippingAddress2: req.body.shippingAddress2,
        city: req.body.city,
        zip: req.body.zip,
        country: req.body.country,
        phone: req.body.phone,
        status: req.body.status,
        totalPrice: totalPrice,
        user: req.body.user,
    })

    order = await order.save();

    if (!order)
        return res.status(404).send('Order cannot be created')
    res.send(order);
})

router.put('/:id', sensitiveLimiter, async (req, res) => {
    const order = await Order.findByIdAndUpdate(req.params.id, {
        status: req.body.status,
    }, {
        new: true
    })

    if (!order)
        return res.status(404).send('Order cannot be created')
    res.send(order);
})

router.delete('/:id', sensitiveLimiter, (req, res) => {
    Order.findByIdAndRemove(req.params.id).then(async order => {
        if (order) {
            await order.orderItems.map(async orderItem =>{
                await OrderItem.findByIdAndRemove(orderItem)
            })
            return res.status(200).json({ success: true, message: 'Order deleted successfully' })
        } else {
            return res.status(404).json({ success: false, message: 'Order cannot find' })
        }
    }).catch(err => {
        return res.status(400).json({ success: false, error: err })
    })
})

router.get('/get/count', async (req, res) => {
    const orderCount = await Order.countDocuments((count) => count);
    if (!orderCount) {
        res.status(500), json({ success: false })
    }
    res.status(200).send({
        orderCount: orderCount
    });
})

router.get('/get/totalsales', async (req, res) => {
    const totalSales = await Order.aggregate([
        { $group: {_id: null, totalsales:{ $sum :'$totalPrice'}}}
    ])

    if (!totalSales){
        return res.status(400).send('the order sales cannot be generated')
    }
    res.send({ totalsales: totalSales.pop().totalsales})
})

router.get('/get/usersorders/:userid', async (req, res) => {
    const userOrderList = await Order.find({user: req.params.userid})
        .populate({
            path: 'orderItems', populate: {
                path: 'product', populate: 'category'
            }
        }).sort({ 'dateOrdered': -1 });

    if (!userOrderList) {
        res.status(500).json({ success: false })
    }
    res.send(userOrderList)
})

module.exports = router;