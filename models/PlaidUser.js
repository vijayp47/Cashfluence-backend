const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const PlaidUser = sequelize.define('PlaidUser', {
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
    primaryKey: true,
  },
  first_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  last_name: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  dob: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  address: {
    type: DataTypes.JSON, // Store address as a JSON object
    allowNull: true,
  },
  phone_number: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // KYC Checks
  kyc_status: {
    type: DataTypes.STRING, // Overall KYC status (e.g., success, pending, failed)
    allowNull: true,
  },
  kyc_details: {
    type: DataTypes.JSON, // Store all KYC-related details as JSON
    allowNull: true,
  },

  // Anti-Fraud Checks
  anti_fraud_status: {
    type: DataTypes.STRING, // Overall Anti-Fraud check status
    allowNull: true,
  },
  anti_fraud_details: {
    type: DataTypes.JSON, // Store all Anti-Fraud related information
    allowNull: true,
  },

  // Regulatory Requirements
  regulatory_status: {
    type: DataTypes.STRING, // Overall regulatory compliance status
    allowNull: true,
  },
  regulatory_details: {
    type: DataTypes.JSON, // Store regulatory compliance details
    allowNull: true,
  },

  // Metadata
  plaid_idv_status: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  most_recent_idv_session_id: {
    type: DataTypes.STRING,
    allowNull: true,
  },

  // Additional Checks
  documentary_verification: {
    type: DataTypes.JSON, // Store details of documentary verification
    allowNull: true,
  },
  selfie_check: {
    type: DataTypes.JSON, // Store details of selfie checks
    allowNull: true,
  },
  watchlist_screening_id: {
    type: DataTypes.STRING, // Store watchlist screening ID
    allowNull: true,
  },

  // Timestamps
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
  },
}, {
  tableName: 'PlaidUser',
  timestamps: true, // Enable automatic timestamps
});

module.exports = PlaidUser;
