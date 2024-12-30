// const { Sequelize } = require('sequelize');
// const dotenv = require('dotenv');
// const messages = require('../constants/Messages');
// // Initialize environment variables from the .env file
// dotenv.config();


// const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
//   host: process.env.DB_HOST,
//   dialect: process.env.DB_DIALECT,
//   logging: false,
 
// });


// // Function to connect to the database
// const connectDB = async () => {
//   try {
//     // Authenticate the connection to ensure the credentials and database are correct
//     await sequelize.authenticate();
//     console.log(messages?.DB_CONNECTED);
//   } catch (error) {
//     // Log any connection errors
//     console.error(messages?.DATABASE_ERROE, error.message);
//   }
// };

// // Synchronize models with the database
// const syncDB = async () => {
//   try {
//     // Synchronize all defined models (use `force: false` in production)
//     await sequelize.sync({ force: false });  // Use force: true only in development if needed
  
//   } catch (error) {
//     // Log any errors encountered during synchronization
//     console.error(messages?.DATABASE_SYNC, error.message);
//   }
// };


// // Export the Sequelize instance, models, and utility functions for use elsewhere in the application
// module.exports = { sequelize, connectDB, syncDB };

const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const messages = require('../constants/Messages');

// Initialize environment variables from the .env file
dotenv.config();

// Check if DATABASE_URL is provided (for production environments like Vercel)
const useDatabaseUrl = process.env.DATABASE_URL ? true : false;

// Configure Sequelize
const sequelize = useDatabaseUrl
  ? // Use DATABASE_URL if available
    new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: false, // Disable logging for production
      dialectOptions: {
        ssl: {
          require: true, // Enforce SSL connection
          rejectUnauthorized: false, // Allow self-signed certificates
        },
      },
    })
  : // Fallback to individual environment variables for local development
    new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT || 'postgres', // Default to 'postgres'
      logging: false, // Disable logging
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production' // Enforce SSL in production
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false, // Disable SSL for local development
      },
    });

// Function to connect to the database
const connectDB = async () => {
  try {
    // Authenticate the connection to ensure the credentials and database are correct
    await sequelize.authenticate();
    console.log(messages?.DB_CONNECTED || 'Database connected successfully.');
  } catch (error) {
    // Log any connection errors
    console.error(messages?.DATABASE_ERROR || 'Database connection error:', error.message);
    throw new Error(error.message); // Re-throw the error to stop further execution
  }
};

// Synchronize models with the database
const syncDB = async () => {
  try {
    // Synchronize all defined models (use `force: false` in production)
    await sequelize.sync({ force: false }); // Use force: true only in development if needed
    console.log(messages?.DATABASE_SYNC || 'Database synchronized successfully.');
  } catch (error) {
    // Log any errors encountered during synchronization
    console.error(messages?.DATABASE_SYNC || 'Database synchronization error:', error.message);
    throw new Error(error.message); // Re-throw the error to stop further execution
  }
};

// Export the Sequelize instance, models, and utility functions for use elsewhere in the application
module.exports = { sequelize, connectDB, syncDB };
