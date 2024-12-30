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

// Load environment variables
dotenv.config();

const sequelize = process.env.DATABASE_URL
  ? // Use DATABASE_URL if provided
    new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      protocol: 'postgres',
      logging: false, // Disable logging for production
      dialectOptions: {
        ssl: {
          require: true,
          rejectUnauthorized: false, // Allow self-signed certificates
        },
      },
    })
  : // Fallback to environment variables for local development
    new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
      host: process.env.DB_HOST,
      dialect: process.env.DB_DIALECT || 'postgres',
      logging: false,
      dialectOptions: {
        ssl: process.env.NODE_ENV === 'production'
          ? {
              require: true,
              rejectUnauthorized: false,
            }
          : false,
      },
    });

const connectDB = async () => {
  try {
    await sequelize.authenticate();
    console.log(messages?.DB_CONNECTED || 'Database connected successfully.');
  } catch (error) {
    console.error(messages?.DATABASE_ERROR || 'Database connection error:', error.message);
    throw new Error(error.message);
  }
};

const syncDB = async () => {
  try {
    await sequelize.sync({ force: false });
    console.log(messages?.DATABASE_SYNC || 'Database synchronized successfully.');
  } catch (error) {
    console.error(messages?.DATABASE_SYNC || 'Database synchronization error:', error.message);
    throw new Error(error.message);
  }
};

module.exports = { sequelize, connectDB, syncDB };
