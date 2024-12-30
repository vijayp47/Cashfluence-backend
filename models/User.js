// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/db');

// // Define the User model
// const User = sequelize.define('User', {

//   firstName: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   lastName: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   email: {
//     type: DataTypes.STRING,
//     allowNull: false,
//     unique: true
//   },
//   password: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   otp: {
//     type: DataTypes.STRING, // Store the OTP
//     allowNull: true
//   },
//   otpExpiration: {
//     type: DataTypes.DATE, // Store OTP expiration time
//     allowNull: true
//   },
//   resetPasswordToken: {
//     type: DataTypes.STRING, // Store token for password reset
//     allowNull: true
//   },
//   resetPasswordExpires: {
//     type: DataTypes.DATE, // Store expiration time for password reset token
//     allowNull: true
//   },
//   message: {
//     type: DataTypes.TEXT,
//     allowNull: true,
//   },
//   isVerified: {
//     type: DataTypes.BOOLEAN, // To check if the user verified their email
//     defaultValue: false
//   },
//   image: {
//     type: DataTypes.STRING,
//     allowNull: true, // Allow storing image file paths or URLs
//   },
// });


// module.exports = User;
// const { DataTypes } = require('sequelize');
// const { sequelize } = require('../config/db');

// // Define the User model
// const User = sequelize.define('User', {

//   firstName: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   lastName: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   email: {
//     type: DataTypes.STRING,
//     allowNull: false,
//     unique: true
//   },
//   password: {
//     type: DataTypes.STRING,
//     allowNull: false
//   },
//   otp: {
//     type: DataTypes.STRING, // Store the OTP
//     allowNull: true
//   },
//   otpExpiration: {
//     type: DataTypes.DATE, // Store OTP expiration time
//     allowNull: true
//   },
//   resetPasswordToken: {
//     type: DataTypes.STRING, // Store token for password reset
//     allowNull: true
//   },
//   resetPasswordExpires: {
//     type: DataTypes.DATE, // Store expiration time for password reset token
//     allowNull: true
//   },
//   message: {
//     type: DataTypes.TEXT,
//     allowNull: true,
//   },
//   isVerified: {
//     type: DataTypes.BOOLEAN, // To check if the user verified their email
//     defaultValue: false
//   },
//   image: {
//     type: DataTypes.STRING,
//     allowNull: true, // Allow storing image file paths or URLs
//   },
// });


// module.exports = User;
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
});

// One-to-many relationship: A User can have many Accounts
User.hasMany(Account, {
  foreignKey: {
    name: 'userId',  // Reference key for User in Account model
    allowNull: false,
  }
});

Account.belongsTo(User, {
  foreignKey: {
    name: 'userId',  // Foreign key for Account pointing to User
    allowNull: false,
  }

});

module.exports = User;
