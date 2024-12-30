const { sequelize } = require('../config/db'); 
const { DataTypes } = require('sequelize');

// Define the InterestRateTable model
const InterestRateTable = sequelize.define('InterestRateTable', {
    user_id: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
        primaryKey: true,
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
        type: DataTypes.JSONB, // Store Facebook-related data as JSON
        allowNull: true,
    },
    // twitter_data: {
    //     type: DataTypes.JSONB, // Store Twitter-related data as JSON
    //     allowNull: true,
    // },
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
