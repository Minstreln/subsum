const CustomerWallet = require('../models/wallet/customerWalletModel');
const _ = require('lodash');
const { initializePayment, verifyPayment } = require('./payment');

class PaymentService {
    startPayment(data) {
        return new Promise((resolve, reject) => {
            try {
                const form = _.pick(data, ['amount', 'email', 'full_name']);
                form.metadata = {
                    full_name: form.full_name,
                };
                form.amount *= 100;

                initializePayment(form, (error, body) => {
                    if (error) {
                        return reject(error.message);
                    }
                    return resolve(body);
                });
            } catch (error) {
                error.source = "Start payment service";
                return reject(error);
            }
        });
    }

    createPayment(req, user) {
        const ref = req.reference;
        if (ref == null) {
            return Promise.reject({ code: 400, msg: 'No reference passed in query!' });
        }
    
        return new Promise(async (resolve, reject) => {
            try {
                verifyPayment(ref, async (error, body) => {
                    if (error) {
                        return reject(error.message);
                    }
                    const response = JSON.parse(body);
    
                    const { reference, amount, status } = response.data;
                    const { email } = response.data.customer;
                    const full_name = response.data.metadata.full_name;
    
                    try {
                        let existingWallet = await CustomerWallet.findOne({ userId: user });
    
                        if (existingWallet) {
                            existingWallet.reference.push(reference);
                            existingWallet.amount.push(amount); 
                            existingWallet.full_name = full_name;
                            existingWallet.email = email;
                            existingWallet.status.push(status);
                            if (status === 'success') {
                                existingWallet.balance += amount / 100; 
                            }
                            await existingWallet.save();
                        } else {
                            const newWallet = {
                                reference: [reference],
                                amount: [amount],
                                full_name,
                                email,
                                status: [status],
                                userId: user,
                            };
                            if (status === 'success') {
                                newWallet.balance = amount / 100; 
                            }
                            existingWallet = await customerWallet.create(newWallet);
                        }
                        resolve(existingWallet);
                    } catch (error) {
                        reject(error);
                    }
                });
            } catch (error) {
                error.source = "Create payment service";
                return reject(error);
            }
        });
    }     

    paymentReceipt(body) {
        return new Promise((resolve, reject) => {
            try {
                const reference = body.reference;
                const transaction = CustomerWallet.findOne({ reference: reference });
                return resolve(transaction);
            } catch (error) {
                error.source = "Payment receipt";
                return reject(error);
            }
        });
    }
}

module.exports = PaymentService;
