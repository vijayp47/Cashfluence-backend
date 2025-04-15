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
    allowNull: false, 
  },
  idCard: {
    type: DataTypes.STRING,
    allowNull: true, 
  },
  passport: {
    type: DataTypes.STRING,
    allowNull: true, 
  },
  selfie: {
    type: DataTypes.STRING,
    allowNull: true, 
  },
});

module.exports = Profile;
