const { DataTypes } = require('sequelize');
const { sequelize } = require('../config/db');

const Profile = sequelize.define('Profile', {
  name: {
    type: DataTypes.STRING,
    allowNull: false, // Make sure name is mandatory
  },
  dob: {
    type: DataTypes.DATE,
    allowNull: false, // Date of birth should be mandatory
  },
  address: {
    type: DataTypes.STRING,
    allowNull: false, // Address should be mandatory
  },
  employment: {
    type: DataTypes.STRING,
    allowNull: false, // Employment status should be mandatory
  },
  income: {
    type: DataTypes.FLOAT,
    allowNull: false, // Income should be mandatory
  },
  idCard: {
    type: DataTypes.STRING,
    allowNull: true, // Can be nullable since it's an optional file
  },
  passport: {
    type: DataTypes.STRING,
    allowNull: true, // Can be nullable since it's an optional file
  },
  selfie: {
    type: DataTypes.STRING,
    allowNull: true, // Can be nullable since it's an optional file
  },
});

module.exports = Profile;
