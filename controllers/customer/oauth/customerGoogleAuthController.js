const jwt = require('jsonwebtoken');
const axios = require('axios');
const Customer = require('../../../models/customer/customerModel');
const createWallet = require('../../wallet/createWalletController');
const catchAsync = require('../../../utils/catchAsync');

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

// GOOGLE AUTHENTICATION

// Initiates the Google sign-in flow
exports.customerAuthInit = catchAsync(async (req, res, next) => {
    const scope = encodeURIComponent('https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email');
    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${process.env.CLIENT_ID}&redirect_uri=${process.env.REDIRECT_URI}&response_type=code&scope=${scope}`;
    
    res.status(200).json({
      status: 'success',
      message: url,
    });
});

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

const generateTempPassword = () => {
    const length = 6;
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let tempPassword = '';
    for (let i = 0; i < length; i++) {
      tempPassword += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return tempPassword;
};
  
// Callback URL for handling the Google sign in response
exports.customerAuthCallback = catchAsync(async (req, res, next) => {
    const { code } = req.query;

    const { referredBy } = req.body;

    if (referredBy) {
        const referrer = await Customer.findOne({ referralCode: referredBy });
        if (!referrer) {
            return next(new AppError('Invalid referral code', 400));
        }
    }

    // Exchange authorization code for access token
    const { data } = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code,
      redirect_uri: process.env.REDIRECT_URI,
      grant_type: 'authorization_code',
    });
  
    const { access_token, id_token } = data;
  
    // Verify and decode the id_token
    const decodedToken = jwt.decode(id_token);
    // const decodedToken = jwt.verify(id_token, GOOGLE_PUBLIC_KEY);
  
    // Use the decoded token to extract user information
    const { email, given_name, family_name, email_verified, picture } = decodedToken;
  
    // Generate temporary password
    const password = generateTempPassword();

    // generate unique referral code
    const referralCode = await generateUniqueReferralCode();
  
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      createSendToken(existingCustomer, 200, res, {
        status: 'success',
        message: 'Log in successful, welcome back!'
      });
    } else {
      const newCustomer = await Customer.create({
        firstName: given_name,
        lastName: family_name,
        email: email,
        emailVerify: email_verified,
        photo: picture,
        password: password,
        passwordConfirm: password,
        referralCode: referralCode,
        referredBy: referredBy,
        createdAt: new Date(),
        emailVerifiedAt: email_verified ? new Date() : null,
      });

      const wallet = await createWallet(newCustomer._id);
  
      createSendToken(newCustomer, 201, res, {
        status: 'success',
        message: 'Sign in successful, Welcome to the Subsum community! Now proceed to update your profile!'
      });
     }
});
  