const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db'); // Ensure correct import of sequelize

// Define the Admin model
const Admin = sequelize.define('Admin', {
  id: {
    type: DataTypes.UUID, // Use UUID as the primary key
    defaultValue: DataTypes.UUIDV4, // Automatically generate UUIDs
    primaryKey: true,
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  lastName: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true,
    },
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  image: {
    type: DataTypes.STRING,
    allowNull: true, // Allow storing image file paths or URLs
  },
  resetPasswordToken: {
    type: DataTypes.STRING, // Or VARCHAR(255), adjust based on your DB
    allowNull: true,  // Allowing null is necessary if it can be null
  },
  resetPasswordExpires: {
    type: DataTypes.DATE, // Using DATE for expiration
    allowNull: true,
  },
}, {
  tableName: 'admins', // Specify table name explicitly if needed
  timestamps: true, // Automatically add createdAt and updatedAt fields
});

module.exports = Admin;
