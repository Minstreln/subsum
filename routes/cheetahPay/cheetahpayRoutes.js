const express = require('express');
const customerAuthController = require('../../controllers/customer/customerAuthController');
const cheetahPayController = require('../../controllers/cheetahpay/cheetahpayController');

const Router = express.Router();

// convert airtime to cash endpoint
Router.post('/airtime-to-cash', 
    customerAuthController.protect,
    customerAuthController.restrictTo('customer'),
    cheetahPayController.airtimeToCash
);

module.exports = Router;
