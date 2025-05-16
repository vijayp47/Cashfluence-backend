const { sequelize } = require('../config/db');
const { DataTypes } = require('sequelize');

const LoanEligibility = sequelize.define('LoanEligibility', {
  state: {
    type: DataTypes.STRING(100),
    allowNull: false,
  },
  state_code: {
    type: DataTypes.STRING(2),
    allowNull: false,
  },

  // Short-Term Loan Fields
  short_term_allowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  short_term_max_amount: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  short_term_min_term: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },
  short_term_max_term: {
    type: DataTypes.INTEGER,
    allowNull: true,
  },

  // Installment Loan Fields
  installment_allowed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
  },
  max_installment_apr: {
    type: DataTypes.STRING(50), // Store as string for values like "36%", "24%–36%", etc.
    allowNull: true,
  },

  // Other Details
  notes: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
}, {
  tableName: 'LoanEligibility',
  timestamps: true,
});

module.exports = LoanEligibility;
