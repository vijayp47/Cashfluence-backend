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

// Controller to exchange public token for access token
const exchangePublicToken = async (req, res) => {
  const { public_token } = req.body;
  try {
    const response = await plaidClient.itemPublicTokenExchange({ public_token });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response.data });
  }
};

// Controller to create transfer authorization
const createTransferAuthorization = async (req, res) => {
  const { access_token, account_id } = req.body;
  try {
    const response = await plaidClient.transferAuthorizationCreate({
      access_token,
      type: 'credit',
      network: 'ach',
      amount: '12.34',
      ach_class: 'ppd',
      user: {
        legal_name: 'John Doe',
        email_address: 'johndoe@example.com',
      },
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: error.response.data });
  }
};

module.exports = {
  createACHLinkToken,
  exchangePublicToken,
  createTransferAuthorization,
};
