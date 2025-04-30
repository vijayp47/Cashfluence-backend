// controllers/weightController.js
const WeightConfig = require("../models/WeightConfig");

// Get current weights
exports.getWeights = async (req, res) => {
  try {
    let config = await WeightConfig.findOne();
    if (!config) {
      config = await WeightConfig.create({});
    }
    res.status(200).json(config);
  } catch (error) {
    res.status(500).json({ message: "Error fetching weights", error });
  }
};

// Update weights (admin use)
exports.updateWeights = async (req, res) => {
    try {
      // Validate the incoming data (optional, but recommended)
      const { 
        influencer_engagementRate, 
        influencer_incomeConsistency, 
        influencer_platformDiversity, 
        influencer_contentQuality, 
        rate_paymentHistory, 
        rate_influencerScore 
      } = req.body;
  
      if (
        typeof influencer_engagementRate !== "number" ||
        typeof influencer_incomeConsistency !== "number" ||
        typeof influencer_platformDiversity !== "number" ||
        typeof influencer_contentQuality !== "number" ||
        typeof rate_paymentHistory !== "number" ||
        typeof rate_influencerScore !== "number"
      ) {
        return res.status(400).json({ message: "Invalid data format" });
      }
  
      let config = await WeightConfig.findOne(); // Check if the config exists
      if (!config) {
        config = await WeightConfig.create(req.body); // Create new config if not found
      } else {
        await config.update(req.body); // Update the existing config
      }
  
      res.status(200).json(config); // Respond with the updated config
    } catch (error) {
      console.error("Error updating weights:", error);
      res.status(500).json({ message: "Error updating weights", error });
    }
  };
  
