// controllers/kycController.js
const Profile = require('../models/Profile');
const fs = require('fs');
const path = require('path');
const messages = require('../constants/Messages');

// Create KYC Profile
const createKYCProfile = async (req, res) => {
  const { name, dob, address, employment, income } = req.body;
  const userId = req.user; // Retrieved from the token

  try {
    // Handle file uploads
    const idCard = req.files?.idCard ? req.files.idCard[0].filename : null;
    const passport = req.files?.passport ? req.files.passport[0].filename : null;
    const selfie = req.files?.selfie ? req.files.selfie[0].filename : null;

    // Create or update KYC profile in the database
    await Profile.update({
      name,
      dob,
      address,
      employment,
      income,
      idCard,
      passport,
      selfie,
    }, {
      where: { id: userId },
    });

    res.status(201).json({ message: messages?.KYC_CREATED });
  } catch (err) {
    console.error(err);
    res.status(500).send(messages?.KYC_ERROR,err);
  }
};

// Update KYC Profile
const updateKYCProfile = async (req, res) => {
  const userId = req.user;

  try {
    // You can also modify the update logic as needed
    await createKYCProfile(req, res); // Reuse create logic for simplicity
  } catch (err) {
    console.error(err);
    res.status(500).send(messages?.KYC_ERROR?.err);
  }
};

module.exports = { createKYCProfile, updateKYCProfile };
