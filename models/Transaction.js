const { DataTypes } = require("sequelize");
const { sequelize } = require('../config/db');

const Transaction = sequelize.define("Transaction", {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  user_id: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  loan_id: {
    type: DataTypes.INTEGER,
    allowNull: false,
  },
  stripe_payment_id: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
  },
  status: {
    type: DataTypes.STRING,
    defaultValue: "pending",
  },
  payment_date: {
    type: DataTypes.DATE, 
    allowNull: false,
  },
  emi_no: {
    type: DataTypes.INTEGER,  
  },
  fine_email_sent: {
    type: DataTypes.BOOLEAN,  
    defaultValue: false,
  },
}, {
  tableName: "transactions",
  timestamps: false,
});

module.exports = Transaction;
