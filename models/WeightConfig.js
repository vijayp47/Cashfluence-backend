// models/WeightConfig.js
const { DataTypes } = require("sequelize");
const { sequelize } = require("../config/db");

const WeightConfig = sequelize.define("WeightConfig", {
  influencer_engagementRate: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
  },
  influencer_incomeConsistency: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
  },
  influencer_platformDiversity: {
    type: DataTypes.INTEGER,
    defaultValue: 5,
  },
  influencer_contentQuality: {
    type: DataTypes.INTEGER,
    defaultValue: 10,
  },
  rate_paymentHistory: {
    type: DataTypes.INTEGER,
    defaultValue: 40,
  },
  rate_influencerScore: {
    type: DataTypes.INTEGER,
    defaultValue: 30,
  },
  like_count: { type: DataTypes.INTEGER, defaultValue: 25 },
  comment_count: { type: DataTypes.INTEGER, defaultValue: 20 },
  share_count: { type: DataTypes.INTEGER, defaultValue: 20 },
  save_count: { type: DataTypes.INTEGER, defaultValue: 15 },
  impression_organic_count: { type: DataTypes.INTEGER, defaultValue: 10 },
  reach_organic_count: { type: DataTypes.INTEGER, defaultValue: 10 },
  tweet_count: { type: DataTypes.INTEGER, defaultValue: 10 },
  retweet_count:  { type: DataTypes.INTEGER, defaultValue: 10 },
}, {
  tableName: "weight_config",
  timestamps: false,
});

module.exports = WeightConfig;
