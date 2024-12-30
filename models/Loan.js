// models/Loan.js
const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');  // Ensure User model is correctly defined

const Loan = sequelize.define('Loan', {
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  repaymentTerm: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: 'Pending', // Options: Pending, Approved, Rejected
  },
  account: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  interest: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true, // Or false, depending on your requirement
  },
  loanrequested: {  // Change this to match what you are passing
    type: DataTypes.BOOLEAN, // Assuming you want to store a boolean value
    allowNull: false,
    defaultValue: false,
  },
  riskLevel: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  riskScore: {
    type: DataTypes.DECIMAL(5, 2),
    allowNull: true,
  },
  fromAccount:{
    type: DataTypes.JSONB, // Store bank-related data as JSON
    allowNull: true,
  },
  toAccount:{
    type: DataTypes.JSONB, // Store bank-related data as JSON
    allowNull: true,
  }

}, {
  timestamps: true, // If you want Sequelize to automatically manage createdAt/updatedAt
});

// Association with User model
Loan.belongsTo(User, { foreignKey: 'userId', as: 'user' });
User.hasMany(Loan, { foreignKey: 'userId', as: 'loans' });

module.exports = Loan;
