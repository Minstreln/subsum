const mongoose = require('mongoose');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const customerSchema = mongoose.Schema({
    firstName: {
        type: String,
        required: [true, 'please enter your first name'],
        trim: true,
        maxLength: [100, 'Your first name can not be more than 100 characters!']
    },
    lastName: {
        type: String,
        required: [true, 'please enter your last name'],
        trim: true,
        maxLength: [100, 'Your last name can not be more than 100 characters!']
    },
    email: {
        type: String,
        required: [true, 'Enter your email address'],
        unique: [true, 'This email address already exists on our server!'],
        lowercase: true,
        validate: [validator.isEmail, 'Enter a valid Email address!'],
        index: true,
    },
    phoneNumber: {
        type: String,
        maxLength: 11,
        minlength: 11,
    },
    photo: {
        type: String,
        default: 'default.png',
    },
    role: {
        type: String,
        default: 'customer',
    },
    referralCode: {
        type: String,
        unique: true,
        required: true,
    },
    referralCount:
    { 
        type: Number, 
        default: 0 
    },
    referredBy: 
    { 
        type: String 
    },
    password: {
        type: String,
        required: [true, 'Please enter a password!'],
        trim: true,
        minlength: [6, 'Your password cannot be less than 6 digits!'],
        maxlength: [6, 'Your password can not be greater than 6 digits!'],
        select: false,
    },
    passwordConfirm: {
        type: String,
        required: [true, 'Please confirm your password!'],
        trim: true,
        minlength: [6, 'Your password cannot be less than 6 digits!'],
        maxlength: [6, 'Your password can not be greater than 6 digits!'],
        validate: {
            validator: function (el) {
            return el === this.password;
            },
            message: 'Password do not match',
        },
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date,
    active: {
        type: Boolean,
        default: true,
        select: false,
    },
    rememberMe: {
        type: Boolean,
        default: false,
        select: false,
    },
    confirmationToken: {
        type: String,
        index: true,
    },
    confirmationTokenExpiration: {
        type: Date,
        index: true,
    },
    emailVerify: {
        type: Boolean,
        default: false,
        select: false,
    },
    createdAt: {
        type: Date
    },
    emailVerifiedAt: {
        type: Date
    },
    },
    {
        toJSON: { virtuals: true },
        toObject: { virtuals: true },
    }
);

// virtual populate
// customerSchema.virtual('reviews', {
//     ref: 'Review',
//     foreignField: 'serviceProvider',
//     localField: '_id',
// });

customerSchema.pre(/^find/, function (next) {
    this.find({ active: { $ne: false } });
    next();
  });

customerSchema.pre('save', async function (next) {
    if (!this.isModified('password')) return next();

    this.password = await bcrypt.hashSync(this.password, 12);
    this.passwordConfirm = undefined;
    next();
});

customerSchema.pre('save', async function (next) {
    if (!this.isModified('password') || this.isNew) return next();

    this.passwordChangedAt = Date.now() - 1000;
    next();
});

customerSchema.methods.correctPassword = async function (
    candidatePassword,
    userPassword
) {
    return await bcrypt.compare(candidatePassword, userPassword);
};

customerSchema.methods.changedPasswordAfter = function (JWTTimestamp) {
    if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(
        this.passwordChangedAt.getTime() / 1000,
        10
    );
    return JWTTimestamp < changedTimestamp;
    }
    return false;
};

customerSchema.methods.createPasswordResetToken = function () {
    const resetToken = crypto.randomBytes(32).toString('hex');

    this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

    // console.log({ resetToken }, this.passwordResetToken);

    this.passwordResetExpires = Date.now() + 1 * 60 * 1000;

    return resetToken;
};

const Customer =  mongoose.model('Customer', customerSchema);

module.exports = Customer;
