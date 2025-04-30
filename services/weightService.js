const WeightConfig = require("../models/WeightConfig");

const getWeightPercentages = async () => {
  let config = await WeightConfig.findOne();
  if (!config) {
    config = await WeightConfig.create({});
  }

  return {
    like_count: config.like_count / 100,
    comment_count: config.comment_count / 100,
    share_count: config.share_count / 100,
    save_count: config.save_count / 100,
    impression_organic_count: config.impression_organic_count / 100,
    reach_organic_count: config.reach_organic_count / 100,
  };
};
module.exports = { getWeightPercentages };