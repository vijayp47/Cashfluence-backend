const { sequelize } = require('../config/db'); 
const { DataTypes } = require('sequelize');


const InterestRateStateData = sequelize.define(
  'interestRateStateData',
  {
    loan_term: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    loan_amount: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    state: {
      type: DataTypes.STRING(100),
      allowNull: false,
    },
    state_code: {
      type: DataTypes.CHAR(2),
      allowNull: false,
    },
    value: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false,
    },
  },
  {
    tableName: 'interestRateStateData', // Ensure this matches your table name
    timestamps: false, // Disable Sequelize's auto-generated `createdAt` and `updatedAt` fields
  }
);

module.exports = InterestRateStateData;
