// controllers/complianceController.js
const User = require('../models/User');

// Fetch compliance status for a user
const getComplianceStatus = async (req, res) => {
  const { userId } = req.params; // User ID passed as parameter

  try {
    // Find the user in the database by userId
    const user = await User.findByPk(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send back compliance status
    const complianceStatus = {
      kyc: {
        status: user.kycStatus,
        details: user.kycDetails,
      },
      antiFraud: {
        status: user.antiFraudStatus,
        details: user.antiFraudDetails,
      },
      regulatory: {
        status: user.regulatoryStatus,
        details: user.regulatoryDetails,
      },
    };

    return res.json({ complianceStatus });
  } catch (error) {
    console.error("Error fetching compliance status:", error);
    return res.status(500).json({ message: "Failed to fetch compliance status." });
  }
};

// Update compliance status
const updateComplianceStatus = async (req, res) => {
    const { userId } = req.params;
    const {
      kycStatus, kycDetails, 
      antiFraudStatus, antiFraudDetails, 
      regulatoryStatus, regulatoryDetails, 
      auditDetails,
    } = req.body;
  
    try {
      // Find the user
      const user = await User.findByPk(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
  
      // Update the compliance status and last updated fields
      user.kycStatus = kycStatus || user.kycStatus;
      user.kycDetails = kycDetails || user.kycDetails;
      user.kycLastUpdated = new Date();
  
      user.antiFraudStatus = antiFraudStatus || user.antiFraudStatus;
      user.antiFraudDetails = antiFraudDetails || user.antiFraudDetails;
      user.antiFraudLastUpdated = new Date();
  
      user.regulatoryStatus = regulatoryStatus || user.regulatoryStatus;
      user.regulatoryDetails = regulatoryDetails || user.regulatoryDetails;
      user.regulatoryLastUpdated = new Date();
  
      user.auditDetails = auditDetails || user.auditDetails;
  
      await user.save();
  
      return res.status(200).json({ message: "Compliance status updated successfully" });
    } catch (error) {
      console.error("Error updating compliance status:", error);
      return res.status(500).json({ message: "Failed to update compliance status." });
    }
  };

module.exports = {
  getComplianceStatus,
  updateComplianceStatus,
};
