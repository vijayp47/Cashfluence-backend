const { Sequelize } = require('sequelize');
const dotenv = require('dotenv');
const messages = require('../constants/Messages');
// Initialize environment variables from the .env file
dotenv.config();


const sequelize = new Sequelize(process.env.DB_NAME, process.env.DB_USER, process.env.DB_PASSWORD, {
  host: process.env.DB_HOST,
  dialect: process.env.DB_DIALECT,
  logging: false,
 
});


// Function to connect to the database
const connectDB = async () => {
  try {
    // Authenticate the connection to ensure the credentials and database are correct
    await sequelize.authenticate();
    console.log(messages?.DB_CONNECTED);
  } catch (error) {
    // Log any connection errors
    console.error(messages?.DATABASE_ERROE, error.message);
  }
};

// Synchronize models with the database
const syncDB = async () => {
  try {
    // Synchronize all defined models (use `force: false` in production)
    await sequelize.sync({ force: false });  // Use force: true only in development if needed
  
  } catch (error) {
    // Log any errors encountered during synchronization
    console.error(messages?.DATABASE_SYNC, error.message);
  }
};


// Export the Sequelize instance, models, and utility functions for use elsewhere in the application
module.exports = { sequelize, connectDB, syncDB };
