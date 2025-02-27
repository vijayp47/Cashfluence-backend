const { sequelize } = require('../config/db'); 
const { DataTypes, NUMBER } = require('sequelize');

const LiabilitiesData = sequelize.define('LiabilitiesData', {
    id: {
      type: DataTypes.STRING, // Composite key based on user ID and liability type
      primaryKey: true,
    },
    user_id: {
      type: DataTypes.NUMBER,
      allowNull: false,
    },
    liability_type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    liability_data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  }, {
    tableName: 'liabilities_data',
    timestamps: false,
    underscored: true,
  });
  
  module.exports = LiabilitiesData;
  