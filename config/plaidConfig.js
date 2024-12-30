
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');



// Initialize Plaid client (configuration and instantiation)
const configuration = new Configuration({
    basePath: PlaidEnvironments.sandbox, // Can be switched to development or production
    baseOptions: {
        headers: {
            'PLAID-CLIENT-ID': '6761cc63f261000019c93137',  // Replace with your actual Plaid client ID
            'PLAID-SECRET': '06cb8c782038f36ea85be0235f8365',  // Replace with your actual Plaid secret
            'Plaid-Version': '2020-09-14'
        },
    },
});

const plaidClient = new PlaidApi(configuration);
module.exports = { plaidClient };
