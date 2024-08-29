const express = require('express');
const customerAuthController = require('../../controllers/customer/customerAuthController');
const customerGoogleAuthController = require('../../controllers/customer/oauth/customerGoogleAuthController');
const customerController = require('../../controllers/customer/customerController');

const Router = express.Router();

// customer registration endpoint
Router.post('/register', customerAuthController.customerRegister);

// customer login endpoint
Router.post('/login', customerAuthController.customerLogin);

// customer logout endpoint
Router.get('/logout', customerAuthController.customerLogout);

/////////////////////////////// GOOGLE OAUTH ENDPOINTS /////////////////////////////////

// Google initialisation endpoint
Router.get('/auth/google', customerGoogleAuthController.customerAuthInit);

// Google callback endpoint
Router.get('/auth/google/callback', customerGoogleAuthController.customerAuthCallback);

/////////////////////////////// LINKEDIN OAUTH ENDPOINTS /////////////////////////////////

// customer forgot password endpoint
Router.post('/forgot-password', customerAuthController.customerForgotPassword);

// customer update password endpoint
Router.patch('/update-password', 
    customerAuthController.protect,
    customerAuthController.restrictTo('customer'),
    customerAuthController.customerUpdatePassword
);

// customer update personal details endpoint
Router.patch('/update-me',
    customerAuthController.protect, 
    customerAuthController.restrictTo('customer'), 
    customerController.uploadCustomerPhoto,
    customerController.resizeCustomerPhoto,
    customerController.customerUpdateMe
);
  
//////////////////////////////// GENERIC ROUTES ////////////////////////////////////////

// customer confirm mail token endpoint
Router.get('/confirm-mail/:token', customerAuthController.confirmMail);

// customer reset password token endpoint
Router.patch('/reset-password/:token', customerAuthController.customerResetPassword);

module.exports = Router;
