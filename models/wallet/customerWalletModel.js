const mongoose = require('mongoose');

const customerWalletSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Customer',
    },
    email: {
        type: String,
        // unique: true,
    },
    full_name: {
        type: String,
        },
    balance: {
        type: Number,
        default: 0,
    },
    transactions: [
            {
            initialAmount: Number,
            amountDebited: Number,
            reason: String,
            createdAt: {
                type: Date,
                default: Date.now,
            },
            status: String,
        }
    ],
    amount: [
            {
            type: Number,
        }
    ],
    reference: [
            {
            type: String,
            // required: true,
            // unique: true,
        }
    ],
    status: [
            {
            type: String,
            // required: true,
        }
    ], 
    },{
        timestamps: true,
});

const CustomerWallet = mongoose.model('CustomerWallet', customerWalletSchema);

module.exports = CustomerWallet;
