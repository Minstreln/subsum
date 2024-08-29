const CustomerWallet = require('../../models/wallet/customerWalletModel');
const catchAsync = require('../../utils/catchAsync');

async function createWallet(userId) {
  try {
    const wallet = await CustomerWallet.create({ userId });
    return wallet;
  } catch (error) {
    console.error('Error details:', error);
    throw new Error(`Failed to create wallet: ${error.message}`);;
  }
}

module.exports = createWallet;
