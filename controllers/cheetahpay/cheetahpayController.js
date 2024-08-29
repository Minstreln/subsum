const CheetahPay = require('../../utils/cheetahpay');
const catchAsync = require('../../utils/catchAsync');

function generateOrderID() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

exports.airtimeToCash = catchAsync(async (req, res) => {
    const { pin, amount, network, depositorsPhoneNo } = req.body;

    const orderID = generateOrderID();

    const cheetahPay = new CheetahPay();

    const result = await cheetahPay.pinDeposit(pin, amount, network, orderID, depositorsPhoneNo);

    res.status(200).json({
        status: 'success',
        data: result
    });
});
