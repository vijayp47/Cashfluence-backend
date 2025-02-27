
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

// const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

// // Initialize Plaid client (configuration and instantiation)
// const configuration = new Configuration({
//     basePath: PlaidEnvironments.sandbox,  // Can be switched to 'development' or 'production'
//     baseOptions: {
//         headers: {
//             'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,  // Use your actual Plaid client ID from environment variables
//             'PLAID-SECRET': process.env.PLAID_SECRET,  // Use your actual Plaid secret from environment variables
//             'Plaid-Version': '2020-09-14',
//         },
//     },
// });

// const plaidClient = new PlaidApi(configuration);

// // Export the client for use in other modules
// module.exports = { plaidClient };
