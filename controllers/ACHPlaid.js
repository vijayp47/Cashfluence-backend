const { PlaidApi, Configuration, PlaidEnvironments } = require('plaid');
const { plaidClient } = require("../config/plaidConfig");

// Controller to create Link token
const createACHLinkToken = async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: '789',
      },
      client_name: 'Cashfluence',
      products: ['auth', 'transfer',"transactions"],
      country_codes: ['US'],
      language: 'en',
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response.data });
  }
};


module.exports = {
  createACHLinkToken,

};
