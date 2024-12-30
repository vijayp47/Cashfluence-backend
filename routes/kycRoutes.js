const express = require('express');
const multer = require('multer');
const Profile = require('../models/Profile'); // Adjust the path if necessary
const fs = require('fs'); // File system to handle file operations
const messages = require('../constants/Messages');

const router = express.Router();

// Ensure 'uploads' directory exists
const uploadDir = 'uploads/';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir);
}

// Configure storage options
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Directory to save uploaded files
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname); // Append timestamp to the original filename
  }
});

// Set up multer with defined storage and limits (5MB per file)
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB file size limit
  fileFilter: (req, file, cb) => {
    // Only allow certain file types
    if (
      file.mimetype === 'image/jpeg' ||
      file.mimetype === 'image/png' ||
      file.mimetype === 'application/pdf'
    ) {
      cb(null, true);
    } else {
      cb(new Error(messages?.INVALID_FILE), false);
    }
  }
});

// Endpoint to upload KYC documents
router.post(
  '/upload',
  upload.fields([{ name: 'idCard', maxCount: 1 }, { name: 'passport', maxCount: 1 }, { name: 'selfie', maxCount: 1 }]),
  async (req, res) => {
    try {
      // Ensure req.files is populated by multer
      if (!req.files) {
        return res.status(400).json({ error: messages?.NO_FILES  });
      }

      // Extract data from the request body
      const { name, dob, address, employment, income } = req.body;

      // Validate that required fields are provided
      if (!name || !dob || !address || !employment || !income) {
        return res.status(400).json({ error: messages?.MISSING_FIELDS });
      }

      // Retrieve file paths for the uploaded files
      const idCard = req.files['idCard'] ? req.files['idCard'][0].path : null;
      const passport = req.files['passport'] ? req.files['passport'][0].path : null;
      const selfie = req.files['selfie'] ? req.files['selfie'][0].path : null;

      // Create a new profile with the provided data and file paths
      const profile = await Profile.create({
        name,
        dob,
        address,
        employment,
        income,
        idCard,
        passport,
        selfie,
      });

      // Return the created profile as a response
      res.status(201).json(profile);
    } catch (error) {
      console.error(messages?.SAVING_PROFILE_ERROR, error); // Log full error
      res.status(500).json({ error: messages?.UPLOAD_ERROR });
    }
  }
);

module.exports = router;


