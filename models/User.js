const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');
const { Account } = require('../models/Plaid');

// Define the User model
const User = sequelize.define('User', {
  firstName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  otp: {
    type: DataTypes.STRING, // Store the OTP
    allowNull: true
  },
  otpExpiration: {
    type: DataTypes.DATE, // Store OTP expiration time
    allowNull: true
  },
  resetPasswordToken: {
    type: DataTypes.STRING, // Store token for password reset
    allowNull: true
  },
  resetPasswordExpires: {
    type: DataTypes.DATE, // Store expiration time for password reset token
    allowNull: true
  },
  message: {
    type: DataTypes.TEXT,
    allowNull: true,
  },
  isVerified: {
    type: DataTypes.BOOLEAN, // To check if the user verified their email
    defaultValue: false
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true, // Allow storing image file paths or URLs
  },
  hasPaidForVerification: {  // column to track verification payment status
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false // Default is false, meaning user hasn't paid
  },
  lastLoginAt: {
    type: DataTypes.DATE,
    allowNull: true,
  },
  termsAccepted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
  },
  
});


User.hasMany(Account, {
  foreignKey: {
    name: 'userId',
    allowNull: false,
  },
  onDelete: 'CASCADE' 
});

Account.belongsTo(User, {
  foreignKey: {
    name: 'userId',
    allowNull: false,
  },
  onDelete: 'CASCADE' // Ensure referential integrity
});




module.exports = User;
