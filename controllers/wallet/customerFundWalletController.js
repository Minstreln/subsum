const PaymentService = require('../../utils/payment.service');
const catchAsync = require('../../utils/catchAsync');

const paymentInstance = new PaymentService();

exports.startFunding = catchAsync(async (req, res, next) => {
    const { firstName, lastName, email } = req.user;

    const full_name = `${firstName} ${lastName}`;

    const paymentData = {
        ...req.body,
        email,
        full_name,
    };

    const response = await paymentInstance.startPayment(paymentData);

    res.status(201).json({
        status: 'success',
        data: response,
    });
});

exports.createFunding = catchAsync(async (req, res, next) => {
    const user = req.user._id
    const response = await paymentInstance.createPayment(req.query, user);

    res.status(201).json({
        status: 'success',
        data: response,
    });
});

exports.getFunding = catchAsync(async (req, res, next) => {
    const response = await paymentInstance.paymentReceipt(req.body);

    res.status(201).json({
        status: 'success',
        data: response,
    });
});