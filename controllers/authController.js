
const Loan = require("../models/Loan");
const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const crypto = require("crypto");
const { Op } = require("sequelize");
const messages = require("../constants/Messages");
const { v4: uuidv4 } = require('uuid');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 
// Initialize environment variables from the .env file
dotenv.config();
const baseUrl = process.env.baseUrl;

// Helper function to send OTP email
const sendOtpEmail = (email, otp) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: messages?.OTP_VERFICATION,
    text: `Your OTP for account verification is: ${otp}. It expires in 10 minutes.`,
  };

  return transporter.sendMail(mailOptions);
};

// Register a new user
// Register a new user
const registerUser = async (req, res) => {
  const { firstName, lastName, email, password } = req.body;

  try {
    // Check if user already exists
    let user = await User.findOne({ where: { email } });
    if (user) {
      return res.status(400).json({ message: messages?.USER_EXIST });
    }

    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Generate OTP
    const otp = crypto.randomBytes(3).toString("hex"); // Generate a 6-digit OTP
    const otpExpiration = Date.now() + 10 * 60 * 1000; // OTP valid for 10 minutes

    // Create the user with OTP details
    user = await User.create({
      firstName,
      lastName,
      email,
      password: hashedPassword,
      otp,
      otpExpiration,
    });

    // Send OTP email
    await sendOtpEmail(email, otp);
    return res.status(201).json({ message: messages?.USER_REGISTERED });
  } catch (err) {
    console.error(messages?.REGISTRATION_ERROR, err);
    return res.status(500).json({ message: messages?.REGISTRATION_ERROR });
  }
};

// Verify OTP
const verifyOtp = async (req, res) => {
  const { email, otp } = req.body;

  try {
    // Find the user by email

    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: messages?.USER_NOT_FOUND });
    }

    // Check if OTP is valid
    if (user.otp !== otp || Date.now() > user.otpExpiration) {
      return res.status(400).json({ message: messages?.OTP_INVALID });
    }

    // Update user to mark email as verified
    user.isVerified = true;
    user.otp = null; // Clear OTP after successful verification
    user.otpExpiration = null; // Clear OTP expiration date
    await user.save();

    res.status(200).json({ message: messages?.EMAIL_VERIFIED });
  } catch (err) {
    console.error(messages?.OTP_VERIFICATION_ERROR, err);
    res.status(500).json({ message: messages?.OTP_VERIFICATION_ERROR });
  }
};

// Login a user
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: messages?.USER_NOT_FOUND });
    }

    // Compare passwords
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: messages?.INVALID_CREDENTIALS });
    }

    // Generate JWT token
    const payload = {
      userId: user.id, // You can include user-specific data here
      email: user.email,
    };



    // Create the JWT token (you may want to use a secret key from environment variables)
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });
    await user.update({ lastLoginAt: new Date() });
   
    // Send response with the token
    res.json({
      success: true, // Success status
      message: messages?.LOGIN,
      userId:payload?.userId,
      token, // JWT token in the response
      lastLoginAt: user.lastLoginAt 
    });
  } catch (err) {
    console.error(messages?.LOGIN_ERROR, err);
    res.status(500).json({ message: messages?.LOGIN_ERROR });
  }
};



const contactSupport = async (req, res) => {
  const { message,userId } = req.body; // Get the message from the request body
 
  // Validate the message
  if (!message || message.trim() === '') {
    return res.status(400).json({ message: 'Please provide a valid message.' });
  }

  try {
    // Update the user's record with the message in the User table
    const user = await User.findOne({ where: { id: userId } });


    if (!user) {
      return res.status(404).json({ message: 'User not found.' });
    }

    // Save the message in the User table (assuming 'message' field exists in User table)
    user.message = message; // You can modify this line if you have a different field to store the message
    await user.save(); // Save the changes to the database

    return res.status(200).json({
      success: true,
      message: 'Your message has been saved successfully.',
    });
  } catch (err) {
    console.error('Error while saving message:', err);
    return res.status(500).json({ message: 'Something went wrong. Please try again.' });
  }
};


const changePassword = async (req, res) => {
  // Extract the token from the Authorization header
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  // Destructure password fields from the request body
  const { currentPassword, newPassword, confirmPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return res.status(400).json({ success: false, message: 'Current password, new password, and confirm new password are required' });
  }

  // Validate the new password and confirm password match
  if (newPassword !== confirmPassword) {
    return res.status(400).json({ success: false, message: 'New passwords do not match' });
  }

  try {
    // Verify the token and decode the userId
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const userId = decoded.userId;

    // Fetch the user from the database
    const user = await User.findOne({ where: { id: userId } });
  
    if (!user) {
      return res.status(404).json({ success: false, message: 'user not found' });
    }

    // Check if the current password matches
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    // Check if new password matches current password
    const isSameAsCurrentPassword = await bcrypt.compare(newPassword, user.password);
    if (isSameAsCurrentPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be the same as the current password',
      });
    }

    // Check if new password matches confirm new password
    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match' });
    }

    // Hash the new password and update it
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedNewPassword;
    await user.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      success: false,
      message: error || 'Internal server error',
      error: error.message,
    });
  }
};


// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '../uploads/user');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // Create the directory if it doesn't exist
}
const upload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir); // Use the ensured directory
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`); // Save file with a unique name
    },
  }),
  limits: { fileSize: 2 * 1024 * 1024 }, // Limit file size to 2MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true); // Accept only images
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  },
});

const otpStore = {}; 

const handleOTPAndUserProfileUpdate = async (req, res) => {
  const { email, otp, firstName, lastName } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
   
   const decoded = jwt.verify(token, process.env.JWT_SECRET);
  
    if (!decoded || !decoded.userId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const userId = decoded.userId;
    

    const user = await User.findByPk(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Step 1: Handle OTP Sending
    if (!otp && email && email !== user.email) {
      const otpValue = Math.floor(100000 + Math.random() * 900000);
      otpStore[email] = {
        otp: otpValue,
        expiresAt: Date.now() + 10 * 60 * 1000, // 10 minutes expiration
      };

      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASSWORD,
        },
      });

      const mailOptions = {
        from: process.env.SMTP_USER,
        to: email,
        subject: 'OTP Verification for Profile Update',
        text: `Your OTP is: ${otpValue}. It expires in 10 minutes.`,
      };

      await transporter.sendMail(mailOptions);

      return res.status(200).json({
        success: true,
        message: 'OTP sent successfully to your email. Please verify to proceed.',
      });
    }

    // Step 2: Handle OTP Verification and Profile Update
    if (otp && email && email !== user.email) {
      const otpData = otpStore[email];

      // Check if OTP matches and is not expired
      if (!otpData || otpData.otp !== parseInt(otp, 10) || Date.now() > otpData.expiresAt) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
      }

      // OTP is valid; remove it from otpStore to prevent reuse
      delete otpStore[email];

      // Check if email is already in use
      const existingUser = await User.findOne({ where: { email } });
      if (existingUser) {
        return res.status(400).json({ success: false, message: 'Email is already in use.' });
      }

      // Update email if OTP is valid
      user.email = email;
    }

    // Step 3: Handle Image Upload

    if (req.file) {
      const imagePath = `/uploads/user/${req?.file?.filename}`; // Add '/uploads' prefix
      // Delete the old image if it exists
      if (user.image && fs.existsSync(path.join(__dirname, `..${user.image}`))) {
        fs.unlinkSync(path.join(__dirname, `..${user.image}`));
      }
      user.image = imagePath;
    }

  

    // Step 4: Update other fields
    if (firstName) user.firstName = firstName;
    if (lastName) user.lastName = lastName;

    await user.save();
    const imagePath = `/uploads/user/${encodeURIComponent(req?.file?.filename)}`; // Encode only the filename
    const fullImageUrl = `${req.protocol}://${req.get('host')}${imagePath}`; // Combine with the base URL
 
    return res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: {
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
            image: fullImageUrl, // Correctly formatted URL
        },
    });
    
   
  } catch (error) {
    console.error('Error handling OTP and profile update:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};



const getUserProfile = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    const user = await User.findOne({
      where: { id: userId },  // Find user by userId
      attributes: ['id', 'firstName', 'lastName', 'email', 'image', 'hasPaidForVerification'], // Include hasPaidForVerification
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Apply encoding only to the filename
    const encodedFilename = encodeURIComponent(user?.image?.split('/').pop()); // Encode the filename only
    const imagePath = `/uploads/user/${encodedFilename}`;
    const fullImageUrl = `${req.protocol}://${req.get('host')}${imagePath}`; // Combine with the base URL

    return res.status(200).json({
      success: true,
      data: {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        image: user?.image != null ? fullImageUrl : null,
        hasPaidForVerification: user.hasPaidForVerification, // Include the payment status in response
      },
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};



const sendPasswordResetEmail = (email, token) => {
  const resetLink = `${baseUrl}/reset-password/${token}`;
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: email,
    subject: messages?.RESET,
    html: `
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetLink}">Reset your password</a>
      <p>This link will expire in 15 minutes.</p>
    `,
  };
  return transporter.sendMail(mailOptions);
};

// Forgot Password Handler
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  try {
    // Check if user exists
    const user = await User.findOne({ where: { email } });
    if (!user) {
      return res.status(400).json({ message: messages?.USER_NOT_FOUND });
    }

    // Generate password reset token and expiration time
    const token = crypto.randomBytes(20).toString("hex");
    const tokenExpiration = Date.now() + 15 * 60 * 1000; // Token expires in 15 minutes

    // Save token and expiration time to user
    user.resetPasswordToken = token;
    user.resetPasswordExpires = tokenExpiration;
    await user.save();

    // Send password reset email
    await sendPasswordResetEmail(email, token);

    res.status(200).json({ message: messages?.PASSWORD_LINK_SENT });
  } catch (err) {
    console.error(messages?.FORGOT_PASSWORD_ERROR, err);
    res.status(500).json({ message: messages?.PASSWORD_LINK_SENT_ERROR });
  }
};

// Reset Password Handler
const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Find user by reset token and check if token is still valid
    const user = await User.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: Date.now() }, // Check if token is not expired
      },
    });

    if (!user) {
      return res.status(400).json({ message: messages?.INVALID_TOKEN });
    }

    // Compare new password with the current hashed password
    const isSamePassword = await bcrypt.compare(password, user.password);

    if (isSamePassword) {
      return res.status(400).json({ message: messages?.CHNAGE_PASSWORD_ERROR });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update the user's password
    user.password = hashedPassword;
    user.resetPasswordToken = null; // Clear reset token and expiration
    user.resetPasswordExpires = null;
    await user.save();

    res.status(200).json({ message: messages?.PASSWORD_RESET_SUCCESSFULY });
  } catch (err) {
    console.error(messages?.RESET_ERROR, err);
    return  res.status(500).json({ message: messages?.PASSWORD_RESET_ERROR });
  }
};

const updateOneTimePaymentIdentityStatus = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const userId = decoded.userId;

    // Find user by ID
    const user = await User.findOne({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Update hasPaidForVerification status
    await User.update(
      { hasPaidForVerification: true }, // Set it to true
      { where: { id: userId } }
    );

    return res.status(200).json({
      success: true,
      message: "Payment status updated successfully.",
    });
  } catch (error) {
    console.error("Error updating payment status:", error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


module.exports = {
  registerUser,
  loginUser,
  verifyOtp,
  forgotPassword,
  resetPassword,contactSupport,changePassword,handleOTPAndUserProfileUpdate,upload,getUserProfile,updateOneTimePaymentIdentityStatus
};
