const express = require('express');
const morgan = require('morgan');
const http = require('http');
const rateLimit = require('express-rate-limit');
const AppError = require('./utils/AppError');
const cookieParser = require('cookie-parser');
const cors = require('cors')
const globalErrorHandler = require('./controllers/errorHandler/errController');

const CustomerRouter = require('./routes/customer/customerRoutes');
const WalletFundingRouter = require('./routes/wallet/customerWalletRoutes');
const AirtimeToCashRouter = require('./routes/cheetahPay/cheetahpayRoutes');

const app = express();

app.use(cors())

app.use(cookieParser());

app.use(express.static(`${__dirname}/public}`));

app.use(express.json());

const limiter = rateLimit({
  max: 100,
  windowMs: 60 * 60 * 1000,
  message: 'Too many requests from this IP, please try again in an hour!',
});
app.use('/api', limiter);

app.use(express.json({ limit: '10kb' }));

if (process.env.NODE_ENV === 'development') {
    app.use(morgan('dev'));
};

// customer route
app.use('/api/v1/customer', CustomerRouter);
// customer wallet funding route
app.use('/api/v1/wallet', WalletFundingRouter);
// customer airtime to cash route
app.use('/api/v1/airtime', AirtimeToCashRouter);

app.all('*', (req, res, next) => {
  next(new AppError(`Can't find ${req.originalUrl} on this server 🚨!`, 404));
});

app.use(globalErrorHandler);

module.exports = app;