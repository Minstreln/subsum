const multer = require('multer');
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');
// const crypto = require('crypto');
// const twilio = require('twilio');
// const sendMail = require('../../utils/email');
const AppError = require('../../utils/AppError');
const Customer = require('../../models/customer/customerModel');
const catchAsync = require('../../utils/catchAsync');
const factory = require('../handler/handlerFactory');

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

  if (req.user.photo) {
    const existingPhotoPath = path.join('public/img/customer', req.user.photo);
    if (fs.existsSync(existingPhotoPath)) {
      fs.unlinkSync(existingPhotoPath);
    }
  }

  req.file.filename = `customer-${req.user.id}-${Date.now()}.jpeg`;

  sharp(req.file.buffer)
    .resize(500, 500)
    .toFormat('jpeg')
    .jpeg({ quality: 90 })
    .toFile(`public/img/customer/${req.file.filename}`);

  next();
};

const filterObj = (obj, ...allowedFields) => {
  const newObj = {};
  Object.keys(obj).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = obj[el];
  });
  return newObj;
};

// update customer details after sign up
exports.customerUpdateMe = catchAsync(async (req, res, next) => {
    if (req.body.password || req.body.passwordConfirm) {
        return next(
        new AppError(
            'This is not for password update. Please use /updatePassword'
        ),
        400
        );
    }

    const filteredBody = filterObj(
        req.body,
        'photo',
        'firstName',
        'lastName',
        'email',
        'phoneNumber',
    );
    if (req.file) filteredBody.photo = req.file.filename;

    const updateCustomer = await Customer.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      {
        new: true,
        runValidators: true,
      }
    );
  
    res.status(200).json({
      status: 'success',
      data: {
        user: updateCustomer,
      },
    });
});
