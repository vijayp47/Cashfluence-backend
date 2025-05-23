const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const User = require('./User');
const Transaction = require('./Transaction');

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
    allowNull: true,
  },
  loanrequested: {
    type: DataTypes.BOOLEAN, 
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
  fromAccount: {
    type: DataTypes.JSONB, // Store bank-related data as JSON
    allowNull: true,
  },
  toAccount: {
    type: DataTypes.JSONB,
    allowNull: true,
  },
  isLoanComplete: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  dueDate: { //  New column for next due date
    type: DataTypes.DATE,
    allowNull: true, // Can be null if loan is not approved yet
  },
  submitTime: {
    type: DataTypes.DATE, // Loan apply submit time
    allowNull: true,
  },
  duration: {
    type: DataTypes.FLOAT, // Time taken in seconds
    allowNull: true,
  },
 fee: {
  type: DataTypes.FLOAT,
  allowNull: true,
},
  overdueStatus: { 
    type: DataTypes.STRING,
    allowNull: true, // Can be null initially
    defaultValue: null, // Possible values: null, 'Overdue'
  },
  payoutId: {
  type: DataTypes.STRING,
  allowNull: true,
},
  disbursementPaymentStatus: {
  type: DataTypes.STRING,
  allowNull: true,
  defaultValue: 'Pending', 
},
}, {
  timestamps: true, // Sequelize will auto-manage createdAt/updatedAt
});

// Association with User model



module.exports = Loan;
