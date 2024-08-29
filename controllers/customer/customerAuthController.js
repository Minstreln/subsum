const jwt = require('jsonwebtoken');
const { promisify } = require('util');
const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const axios = require('axios');
const AppError = require('../../utils/AppError');
const createWallet = require('../wallet/createWalletController');
const Customer = require('../../models/customer/customerModel');
const catchAsync = require('../../utils/catchAsync');
const sendMail = require('../../utils/email');

const multerStorage = multer.memoryStorage();

const multerFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image')) {
    cb(null, true);
  } else {
    cb(new AppError('Not an image, please upload only Images', 400), false);
  }
};

const upload = multer({
  storage: multerStorage,
  fileFilter: multerFilter,
});

exports.uploadCustomerPhoto = upload.single('photo');

exports.resizeCustomerPhoto = (req, res, next) => {
  if (!req.file) return next();

  const filenameWithoutExtension = path.parse(req.file.originalname).name;

  req.file.filename = `customer-${filenameWithoutExtension}.jpeg`;

  sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/customer/${req.file.filename}`);

  next();
};

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });

const createSendToken = (user, statusCode, res, jsonResponse) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expires: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };
  if (process.env.NODE_ENV === 'production') cookieOptions.secure = true;

  res.cookie('jwt', token, cookieOptions);

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    ...jsonResponse,
    token,
    data: {
      user,
    },
  });
};

const generateReferralCode = () => {
  const part1 = '18';
  const part2 = Math.random().toString(36).substring(2, 6);
  const part3 = Math.floor(Math.random() * 900 + 100);
  return `${part1}/52${part2}${part3}`;
};

const generateUniqueReferralCode = async () => {
  let isUnique = false;
  let referralCode;

  while (!isUnique) {
    referralCode = generateReferralCode();
    if (referralCode) {
      const existingCustomer = await Customer.findOne({ referralCode });
      if (!existingCustomer) {
        isUnique = true;
      }
    }
  }

  return referralCode;
};


// customer registration logic
exports.customerRegister = catchAsync(async (req, res, next) => {
    const confirmationTokenExpiration = new Date(Date.now() + 5 * 60 * 1000);
    const confirmationToken = crypto.randomBytes(32).toString('hex');
    const { referredBy } = req.body;

    if (referredBy) {
        const referrer = await Customer.findOne({ referralCode: referredBy });
        if (!referrer) {
            return next(new AppError('Invalid referral code', 400));
        }
    }

    const referralCode = await generateUniqueReferralCode();

    const newCustomer = await Customer.create({
        firstName: req.body.firstName,
        lastName: req.body.lastName,
        email: req.body.email,
        phoneNumber: req.body.phoneNumber,
        rememberMe: req.body.rememberMe,
        password: req.body.password,
        passwordConfirm: req.body.passwordConfirm,
        confirmationToken: confirmationToken,
        confirmationTokenExpiration: confirmationTokenExpiration,
        referralCode: referralCode,
        referredBy: referredBy,
        createdAt: new Date(),
    });

    const wallet = await createWallet(newCustomer._id);

    if (req.body.referredBy) {
      await Customer.findOneAndUpdate(
          { referralCode: req.body.referredBy },
          { $inc: { referralCount: 1 } }
      );
    }

    const confirmationLink = `${req.protocol}://${req.get('host')}/api/v1/customer/confirm-mail/${confirmationToken}`;
     const message = `
     <div style="font-family: Arial, sans-serif; line-height: 1.6;">
         <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
             <div style="text-align: center;">
                 <img src="" alt="Subsum Logo" style="max-width: 200px; margin-bottom: 20px;">
             </div>
             <h2 style="color: #333;">Welcome to Subsum Community!</h2>
             <p>Hi ${req.body.firstName},</p>
             <p>Thank you for signing up with Subsum. Please confirm your email address by clicking the button below. This link will expire in 5 minutes.</p>
             <div style="text-align: center; margin: 20px 0;">
                 <a href="${confirmationLink}" style="background-color: #007BA7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Confirm Email</a>
             </div>
             <p>If the button above does not work, copy and paste the following link into your web browser:</p>
             <p><a href="${confirmationLink}">${confirmationLink}</a></p>
             <p>Thank you,<br>The Subsum Team</p>
         </div>
     </div>
     `;

    await sendMail({
        email: req.body.email,
        subject: 'Confirm Your Email Address',
        message,
    });

    createSendToken(newCustomer, 201, res, {
        status: 'success',
        message: 'Confirmation email has been sent. Please check your email to confirm your address.'
    });
});

// mail confirmation logic
exports.confirmMail = catchAsync(async (req, res, next) => {
    const token = req.params.token;

    const customer = await Customer.findOneAndUpdate(
        { confirmationToken: token },
        { $set: { emailVerifiedAt: new Date(), emailVerify: true }, $unset: { confirmationToken: 1, confirmationTokenExpiration: 1 } },
        { new: true }
    );

    if (!customer) {
        return res.status(400).json({
            status: 'fail',
            message: 'Invalid token or token expired.'
        });
    }

    const currentTimestamp = Date.now();
    if (currentTimestamp > customer.confirmationTokenExpiration) {
        return res.status(400).json({
            status: 'fail',
            message: 'Token has expired. Please request a new one.'
        });
    }

    res.status(200).json({
        status: 'success',
        message: 'Email confirmed successfully. Welcome to the Subsum Community! Now proceed to Login and update your profile!',
    });

    const message = `
    <div style="font-family: Arial, sans-serif; line-height: 1.6;">
        <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
            <div style="text-align: center;">
                <img src="" alt="subsum Logo" style="max-width: 200px; margin-bottom: 20px;">
            </div>
            <h2 style="color: #333;">Welcome to Subsum Community!</h2>
            <p>Hi ${customer.firstName},</p>
            <p>Thank you for verifying your email address. Welcome to Subsum Community! Now you can proceed to login and complete your profile!</p>
            <p>Thank you,<br>The Subsum Team</p>
        </div>
    </div>
  `;

  await sendMail({
      email: employer.email,
      subject: 'Welcome to Subsum Community!',
      message,
  });
});

// customer login logic
exports.customerLogin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
      return next(new AppError('Please provide email and password', 400));
  }

  const customer = await Customer.findOne({ email }).select('+password +isBanned +isSuspendedPermanently +suspendedUntil +active +emailVerify');

  // console.log(customer);

  if (!customer || !(await customer.correctPassword(password, customer.password))) {
    return next(new AppError('Incorrect email or password', 401));
  }

  if (customer.active === false) {
    return next(
      new AppError(
        'This account does not exist. Please contact the administrator if you think this is a mistake.',
        403
      )
    );
  }

  const message = customer.emailVerify ? `Welcome back ${customer.firstName} ${customer.lastName}` : `Welcome back ${customer.firstName} ${customer.lastName}!`;
  
  createSendToken(customer, 200, res, {
    status: 'success',
    message
  });
})

// customer logout
exports.customerLogout = (req, res) => {
  res.cookie('jwt', 'loggedout', {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });

  res.status(200).json({
      status: 'success',
      message: `Logged out! Bye for now.`,
  })
};

// customer protect middleware
exports.protect = catchAsync(async (req, res, next) => {
  let token;
  if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
  ) {
      token = req.headers.authorization.split(' ')[1];
  } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
  }

  if (!token) {
      return next(new AppError('Please log in to get access', 401));
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  let currentUser;

  currentUser = await Customer.findById(decoded.id);

  if (!currentUser) {
      return next(new AppError('The token does not exist!', 401));
  }

  if (currentUser.changedPasswordAfter(decoded.iat)) {
      return next(
      new AppError('User recently changed password! Please log in again', 401)
      );
  }

  req.user = currentUser;
  next();
});

// customer isLoggedIn middleware
exports.isLoggedIn = async (req, res, next) => {
  req.locals = req.locals || {};

  if (req.cookies.jwt) {
    try {
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      const currentUser = await Customer.findById(decoded.id);

      if (!currentUser) {
        return next();
      }

      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      req.locals.user = currentUser;
      next();
    } catch (err) {
      return next();
    }
  }
  next();
};

// customer restrict to middleware
exports.restrictTo =
(...roles) =>
(req, res, next) => {
  if (!roles.includes(req.user.role)) {
    return next(
      new AppError('You do not have permission to perform this action'),
      403
    );
  }
  next();
};

// forgot password
exports.customerForgotPassword = catchAsync(async (req, res, next) => {
  const customer = await Customer.findOne({ email: req.body.email });
  if (!customer) {
    return next(new AppError('Enter a valid Email address', 404));
  }

  const resetToken = customer.createPasswordResetToken();
  await customer.save({ validateBeforeSave: false });

  const resetURL = `${req.protocol}://${req.get(
    'host'
  )}/api/v1/customer/reset-password/${resetToken}`;

  const message = `
   <div style="font-family: Arial, sans-serif; line-height: 1.6;">
     <div style="max-width: 600px; margin: auto; padding: 20px; border: 1px solid #ddd; border-radius: 10px;">
       <div style="text-align: center;">
         <img src="" alt="subsum Logo" style="max-width: 200px; margin-bottom: 20px;">
       </div>
       <h2 style="color: #333;">Forgot Your Password?</h2>
       <p>Hi ${customer.firstName},</p>
       <p>Forgot your password? Click the link below to reset it. This link is valid for 10 minutes:</p>
       <div style="text-align: center; margin: 20px 0;">
         <a href="${resetURL}" style="background-color: #007BA7; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Reset Password</a>
       </div>
       <p>If you didn't forget your password, please ignore this email.</p>
       <p>Thank you,<br>The Subsum Team</p>
     </div>
   </div>
 `;

  try {
    await sendMail({
      email: customer.email,
      subject: 'Your password reset token (Valid for only 10mins)',
      message,
    });

    res.status(200).json({
      status: 'success',
      message: 'Token sent to email!',
    });
  } catch (err) {
    customer.passwordResetToken = undefined;
    customer.passwordResetExpired = undefined;
    await customer.save({ validateBeforeSave: false });

    return next(
      new AppError('There was an error sending the email, try again later.'),
      500
    );
  }
});

// customer reset PASSword logic
exports.customerResetPassword = catchAsync(async (req, res, next) => {
  const hashedToken = crypto
    .createHash('sha256')
    .update(req.params.token)
    .digest('hex');

  const customer = await Customer.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!customer) {
    return next(new AppError('Token is Invalid or has expired'), 400);
  }

  customer.password = req.body.password;
  customer.passwordConfirm = req.body.passwordConfirm;
  customer.passwordResetToken = undefined;
  customer.passwordResetExpires = undefined;
  await customer.save();

  createSendToken(customer, 200, res);
});

// customer update password logic
exports.customerUpdatePassword = catchAsync(async (req, res, next) => {
  const customer = await Customer.findById(req.user.id).select('+password');

  if (!(await customer.correctPassword(req.body.passwordCurrent, customer.password))) {
    return next(new AppError('Your current password is wrong', 401));
  }

  customer.password = req.body.password;
  customer.passwordConfirm = req.body.passwordConfirm;
  await customer.save();

  createSendToken(customer, 200, res);
});
