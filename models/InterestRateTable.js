const { sequelize } = require('../config/db'); 
const { DataTypes, NUMBER } = require('sequelize');

// Define the InterestRateTable model
const InterestRateTable = sequelize.define('InterestRateTable', {
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        primaryKey: true,
    },
    userid: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    external_id: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    name: {
        type: DataTypes.STRING,
        allowNull: false,
    },
    platforms: {
        type: DataTypes.JSONB,  // Store platform details as JSON
        allowNull: true,        // Optional: will store the platform information
    },
    instagram_data: {
        type: DataTypes.JSONB, // Store Instagram-related data as JSON
        allowNull: true,
    },
    youtube_data: {
        type: DataTypes.JSONB, // Store YouTube-related data as JSON
        allowNull: true,
    },
    tiktok_data: {
        type: DataTypes.JSONB, 
        allowNull: true,
    },
    twitch_data: {
        type: DataTypes.JSONB, 
        allowNull: true,
    },
    twitter_data: {
        type: DataTypes.JSONB, 
        allowNull: true,
    },
  
    created_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
    updated_at: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW,
    },
}, {
    tableName: 'interestRateTable',  // Custom table name
    timestamps: false,               // Disable auto-generated timestamps
});

module.exports = InterestRateTable;
