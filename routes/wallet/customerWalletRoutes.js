const express = require('express');
const customerFundWalletController = require('../../controllers/wallet/customerFundWalletController');
const customerAuthController = require('../../controllers/customer/customerAuthController');

const Router = express.Router();

// fund wallet endpoint
Router.post('/fund-wallet',
    customerAuthController.protect,
    customerAuthController.restrictTo('customer'),
    customerFundWalletController.startFunding
);

// Initiate the funding
Router.get('/start-funding', 
    customerAuthController.protect,
    customerAuthController.restrictTo('customer'),
    customerFundWalletController.createFunding
);

// get funding details
Router.get('/fund-details',
    customerAuthController.protect,
    customerAuthController.restrictTo('customer'),
    customerFundWalletController.getFunding
 );

module.exports = Router;
