const axios = require('axios');

class CheetahPay {
    static privateKey = process.env.CHEETAH_PRIVATE_KEY;
    static publicKey = process.env.CHEETAH_PUBLIC_KEY;
    static endpoint = 'https://cheetahpay.com.ng/api/v1';

    static NETWORK_9_MOBILE = '9 MOBILE';
    static NETWORK_AIRTEL = 'AIRTEL';
    static NETWORK_GLO = 'GLO';
    static NETWORK_MTN = 'MTN';
    static NETWORK_MTN_TRANSFER = 'MTN TRANSFER';

    constructor(privateKey, publicKey) {
        CheetahPay.privateKey = privateKey;
        CheetahPay.publicKey = publicKey;
    }

    formatPhoneNo(phone) {
        if (!phone) return null;

        phone = phone.replace(/^\+234|^0/, '');
        return '0' + phone;
    }

    async pinDeposit(pin, amount, network, orderID = null, depositorsPhoneNo = null) {
        this.verifyNetworkForPin(network);

        const data = {
            amount: amount,
            private_key: CheetahPay.privateKey,
            public_key: CheetahPay.publicKey,
            phone: this.formatPhoneNo(depositorsPhoneNo),
            pin: pin,
            network: network,
            order_id: orderID,
        };

        try {
            const response = await axios.post(`${CheetahPay.endpoint}/pinDeposit`, data);
            return response.data;
        } catch (error) {
            throw new Error(`Error in pinDeposit: ${error.response ? error.response.data : error.message}`);
        }
    }

    verifyNetworkForPin(network) {
        const validNetworks = [
            CheetahPay.NETWORK_9_MOBILE,
            CheetahPay.NETWORK_AIRTEL,
            CheetahPay.NETWORK_GLO,
            CheetahPay.NETWORK_MTN,
        ];

        if (!validNetworks.includes(network)) {
            throw new Error(
                `Only ${CheetahPay.NETWORK_9_MOBILE}, ${CheetahPay.NETWORK_AIRTEL}, ${CheetahPay.NETWORK_GLO}, ${CheetahPay.NETWORK_MTN} are accepted for pin deposits`
            );
        }
    }
}

module.exports = CheetahPay;
