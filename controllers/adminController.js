// controllers/adminController.js
const User = require('../models/User');
const Admin = require("../models/Admin");
const Loan = require('../models/Loan');
const PlaidUser = require("../models/PlaidUser");
const Transaction = require("../models/Transaction");
const jwt = require('jsonwebtoken');
const dotenv = require('dotenv');
const messages = require('../constants/Messages');
const nodemailer = require("nodemailer");
const crypto = require('crypto');
const { Op,literal,Sequelize } = require("sequelize");
const { sequelize } = require("../config/db");
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs'); 
const { v4: uuidv4 } = require('uuid'); // Import a UUID generator library


// Initialize environment variables from the .env file
dotenv.config();
const baseUrl = process.env.baseUrl;

// Ensure the upload directory exists
const uploadDir = path.join(__dirname, '../uploads/admin');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true }); // Create the directory if it doesn't exist
}

// Multer configuration
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



const createAdmin = async () => {
  try {
    // Sync the Admin model with the database (recreates the table if missing)
  
    // Check if the admin already exists
    const adminExists = await Admin.findOne({ where: { email:process.env.ADMIN_USERNAME } });
    const password = process.env.ADMIN_PASSWORD;
    if (!adminExists) {
      // If admin doesn't exist, hash the password
      const hashedPassword = await bcrypt.hash(password, 10); // Hash the plain password

      // Save the admin with the hashed password
    
      await Admin.create({
        id: uuidv4(), // Generate a valid UUID
        email: process.env.ADMIN_USERNAME,
        password: hashedPassword,
        firstName: 'Admin',
        lastName: '-',
      });

    } else {
      console.log('Admin already exists');
    }
  } catch (error) {
    console.error('Error creating admin account:', error);
    throw error; // If error occurs, throw it to be handled in the login API
  }
};


const AdminGraphLoanDetails = async (req, res) => {
  try {
    // Count loan statuses
    const approvedCount = await Loan.count({ where: { status: "Approved" } });
    const pendingCount = await Loan.count({ where: { status: "Pending" } });
    const rejectedCount = await Loan.count({ where: { status: "Rejected" } });

    // Sum total loan and repaid amount
    const totalLoanAmount = await Loan.sum("amount");
    const repaidAmount = await Loan.sum("amount", { where: { isLoanComplete: true } });

    // Count completed and incomplete loans
    const completedLoans = await Loan.count({ where: { isLoanComplete: true } });
    const incompleteLoans = await Loan.count({ where: { isLoanComplete: false } });

    const data = {
    loanApplicationStatus: [
      { name: "Approved", value: approvedCount },
      { name: "Pending", value: pendingCount },
      { name: "Rejected", value: rejectedCount },
    ],
    loanAmountData: [
      { name: "Total Loan", amount: totalLoanAmount || 0 },
      { name: "Repaid Amount", amount: repaidAmount || 0 },
    ],
    loanCompletionData: [
      { name: "Completed Loans", value: completedLoans },
      { name: "Incomplete Loans", value: incompleteLoans },
    ],
  }
    res.json({
      success:true,
      data:data
    });
  } catch (error) {
    console.error("Error fetching loan stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

const AdminTransactionGraphData = async (req, res) => {
  try {
    // Monthly transactions
    const monthlyTransactions = await Transaction.findAll({
      attributes: [
        [sequelize.fn("DATE_TRUNC", "month", sequelize.col("payment_date")), "month"],
        [sequelize.fn("SUM", sequelize.col("amount")), "totalAmount"],
      ],
      group: ["month"],
      order: [["month", "ASC"]],
    });

    // Yearly transactions
    const yearlyTransactions = await Transaction.findAll({
      attributes: [
        [sequelize.fn("DATE_TRUNC", "year", sequelize.col("payment_date")), "year"],
        [sequelize.fn("SUM", sequelize.col("amount")), "totalAmount"],
      ],
      group: ["year"],
      order: [["year", "ASC"]],
    });
    const data = {
      monthlyTransactions: monthlyTransactions.map((t) => ({
        date: t.getDataValue("month"),
        totalAmount: parseFloat(t.getDataValue("totalAmount")),
      })),
      yearlyTransactions: yearlyTransactions.map((t) => ({
        date: t.getDataValue("year"),
        totalAmount: parseFloat(t.getDataValue("totalAmount")),
      })),
    }
    res.json({
      success:true,
      data:data
    });
  } catch (error) {
    console.error("Error fetching transaction stats:", error);
    res.status(500).json({ error: "Internal server error" });
  }
}

const adminLogin = async (req, res) => {
  const { email, password } = req.body;

  try {
    const adminExists = await Admin.findOne(); // Check if any admin exists

    if (!adminExists) {
      await createAdmin(); // Create an admin if none exists
    }

    // Now proceed with login logic
    const admin = await Admin.findOne({ where: { email } });

    if (!admin) {
      return res.status(400).json({ message: 'Admin not found. Invalid credentials.' });
    }

    // Compare the password with the hashed password in the database
    const isPasswordValid = await bcrypt.compare(password, admin.password);

    if (!isPasswordValid) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    // Issue a JWT token for the authenticated admin
    const token = jwt.sign(
      { adminId: admin.id, role: 'admin' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.json({ token });
  } catch (error) {
    console.error('Error during login:', error);
    return res.status(500).json({ message: 'Internal server error' });
  }
};

const otpStore = {}; 



// Function to check if the email exists and send OTP
// const checkEmailAndSendOTP = async (req, res) => {
//   const { email, otpInput } = req.body; // otpInput is optional for sending the OTP

//   try {
//     // If OTP input is provided, verify the OTP
//     if (otpInput) {
//       // Check if OTP exists for this email and validate the OTP
//       if (!otpStore[email]) {
//         return res.status(400).json({
//           success: false,
//           message: 'No OTP has been generated for this email.',
//         });
//       }

//       // Check if OTP has expired
//       if (Date.now() > otpStore[email].expiresAt) {
//         delete otpStore[email]; // Clear expired OTP
//         return res.status(400).json({
//           success: false,
//           message: 'OTP has expired. Please request a new one.',
//         });
//       }

//       // Check if OTP matches
//       if (otpStore[email].otp != otpInput) {
//         return res.status(400).json({
//           success: false,
//           message: 'Invalid OTP. Please check and try again.',
//         });
//       }

//       // If OTP is correct, return success message and set email as verified
//       delete otpStore[email]; // OTP verified, remove it
//       return res.status(200).json({
//         success: true,
//         message: 'Email verified successfully.',
//         verified: true // Indicate email verification status
//       });
//     }

//     // If no OTP is provided, generate and send a new OTP
//     const existingAdmin = await Admin.findOne({ where: { email } });

//     if (existingAdmin) {
//       return res.status(400).json({
//         success: false,
//         message: 'Email is already in use. Please choose another email.',
//       });
//     }

//     // Send OTP to the new email
//     await sendOTP(email); // Function to send OTP

//     // Return response saying OTP is sent
//     return res.status(200).json({
//       success: true,
//       message: 'OTP has been sent to the new email. Please verify it.',
//       verified: false // Indicate email verification status
//     });

//   } catch (error) {
//     console.error('Error checking email existence or sending OTP:', error);
//     return res.status(500).json({
//       success: false,
//       message: 'Error checking email existence or sending OTP.',
//     });
//   }
// };

const sendOTP = async (email) => {
  // Generate a random 6-digit OTP
  const otp = Math.floor(100000 + Math.random() * 900000);

  // Store OTP in memory or database with expiration time (10 minutes)
  otpStore[email] = {
    otp: otp,
    expiresAt: Date.now() + 10 * 60 * 1000, // OTP expires in 10 minutes
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
    text: `Your OTP for verifying your email is: ${otp}. It expires in 10 minutes.`,
  };

  try {
    await transporter.sendMail(mailOptions);
   
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw new Error('Failed to send OTP. Please try again later.');
  }
};

const handleOTPAndProfileUpdate = async (req, res) => {
  const { email, otp, firstName, lastName } = req.body;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.adminId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const adminId = decoded.adminId;
    const admin = await Admin.findByPk(adminId);

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Step 1: Handle OTP Sending
    if (!otp && email && email !== admin.email) {
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
    if (otp && email && email !== admin.email) {
      const otpData = otpStore[email];

      // Check if OTP matches and is not expired
      if (!otpData || otpData.otp !== parseInt(otp, 10) || Date.now() > otpData.expiresAt) {
        return res.status(400).json({ success: false, message: 'Invalid or expired OTP.' });
      }

      // OTP is valid; remove it from otpStore to prevent reuse
      delete otpStore[email];

      // Check if email is already in use
      const existingAdmin = await Admin.findOne({ where: { email } });
      if (existingAdmin) {
        return res.status(400).json({ success: false, message: 'Email is already in use.' });
      }

      // Update email if OTP is valid
      admin.email = email;
    }

    // Step 3: Handle Image Upload

    if (req.file) {
      const imagePath = `/uploads/admin/${req?.file?.filename}`; // Add '/uploads' prefix
      // Delete the old image if it exists
      if (admin.image && fs.existsSync(path.join(__dirname, `..${admin.image}`))) {
        fs.unlinkSync(path.join(__dirname, `..${admin.image}`));
      }
      admin.image = imagePath;
    }

  

    // Step 4: Update other fields
    if (firstName) admin.firstName = firstName;
    if (lastName) admin.lastName = lastName;

    await admin.save();
    const imagePath = `/uploads/admin/${encodeURIComponent(req?.file?.filename)}`; // Encode only the filename
    const fullImageUrl = `${req.protocol}://${req.get('host')}${imagePath}`; // Combine with the base URL
    
    return res.status(200).json({
        success: true,
        message: 'Profile updated successfully.',
        data: {
            firstName: admin.firstName,
            lastName: admin.lastName,
            email: admin.email,
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

const changePassword = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  const { currentPassword, newPassword, confirmNewPassword } = req.body;

  if (!currentPassword || !newPassword || !confirmNewPassword) {
    return res.status(400).json({
      success: false,
      message: 'Current password, new password, and confirm new password are required',
    });
  }

  try {
    // Verify the token and decode admin ID
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    if (!decoded || !decoded.adminId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const adminId = decoded.adminId;

    // Fetch admin from the database
    const admin = await Admin.findByPk(adminId);
    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Check if the current password matches
    const isPasswordValid = await bcrypt.compare(currentPassword, admin.password);
    if (!isPasswordValid) {
      return res.status(400).json({ success: false, message: 'Current password is incorrect' });
    }

    // Check if new password matches current password
    const isSameAsCurrentPassword = await bcrypt.compare(newPassword, admin.password);
    if (isSameAsCurrentPassword) {
      return res.status(400).json({
        success: false,
        message: 'New password cannot be the same as the current password',
      });
    }

    // Check if new password matches confirm new password
    if (newPassword !== confirmNewPassword) {
      return res.status(400).json({ success: false, message: 'New passwords do not match' });
    }

    // Hash the new password and update it
    const hashedNewPassword = await bcrypt.hash(newPassword, 10);
    admin.password = hashedNewPassword;
    await admin.save();

    return res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (error) {
    console.error('Error changing password:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};


const sendPasswordResetEmail = (email, token) => {
  const resetLink = `${baseUrl}/admin/reset-password/${token}`;
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


const forgotPassword = async (req, res) => {
  const { email } = req.body;



  try {
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "Invalid email address" });
    }

    // Check if user exists
    const admin = await Admin.findOne({ where: { email } });
    if (!admin) {
      return res.status(404).json({ message: "Admin not found" });
    }

    // Generate password reset token and expiration time
    const token = crypto.randomBytes(20).toString("hex");
    const tokenExpiration = Date.now() + 15 * 60 * 1000; // Token expires in 15 minutes

     // Save token and expiration time to user
     admin.resetPasswordToken = token;
     admin.resetPasswordExpires = tokenExpiration;
 
     // Save the admin instance to the database
     await admin.save();
 

    // Send password reset email
    await sendPasswordResetEmail(email, token);

    res.status(200).json({ message: "Password reset link has been sent to your email" });
  } catch (err) {
    console.error("Error processing forgot password request:", err);
    res.status(500).json({ message: "Failed to process password reset request" });
  }
};


const resetPassword = async (req, res) => {
  const { token } = req.params;
  const { password } = req.body;

  try {
    // Find admin by reset token and check if token is still valid
    const admin = await Admin.findOne({
      where: {
        resetPasswordToken: token,
        resetPasswordExpires: { [Op.gt]: new Date() }, // Use new Date() to compare with the TIMESTAMP
      },
    });

    if (!admin) {
      return res.status(400).json({ message: "Admin not found or token has expired" });
    }

    // Compare new password with the current hashed password
    const isSamePassword = await bcrypt.compare(password, admin.password);
    if (isSamePassword) {
      return res.status(400).json({ message: "New password cannot be the same as the current password" });
    }

    // Hash the new password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Update the admin's password
    admin.password = hashedPassword;
    admin.resetPasswordToken = null; // Clear reset token and expiration
    admin.resetPasswordExpires = null;
    await admin.save();

    res.status(200).json({ message: "Password reset successfully" });
  } catch (err) {
    console.error("Error resetting password:", err);
    res.status(500).json({ message: "Error resetting password" });
  }
};


const getAdminProfile = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded || !decoded.adminId) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    const adminId = decoded.adminId;

    const admin = await Admin.findByPk(adminId, {
      attributes: ['id', 'firstName', 'lastName', 'email', 'image'],
    });

    if (!admin) {
      return res.status(404).json({ success: false, message: 'Admin not found' });
    }

    // Apply encoding only to the filename
    const encodedFilename = encodeURIComponent(admin?.image?.split('/').pop()); // Encode the filename only
    const imagePath = `/uploads/admin/${encodedFilename}`;
    const fullImageUrl = `${req.protocol}://${req.get('host')}${imagePath}`; // Combine with the base URL

  
    return res.status(200).json({
      success: true,
      data: {
        id: admin.id,
        firstName: admin.firstName,
        lastName: admin.lastName,
        email: admin.email,
        image: admin?.image != null ? fullImageUrl : null,
      },
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error.message,
    });
  }
};





const getFilterData = async (req, res) => {
  try {
    // Fetch all loans, including both fromAccount and toAccount
    const loans = await Loan.findAll({
      attributes: [
        [Sequelize.json('fromAccount.accountNumber'), 'accountNumber'],
        [Sequelize.json('fromAccount.institutionName'), 'institutionName'],
        [Sequelize.json('fromAccount.accountName'), 'accountName'],
        [Sequelize.json('toAccount.accountNumber'), 'accountNumberTo'],
        [Sequelize.json('toAccount.institutionName'), 'institutionNameTo'],
        [Sequelize.json('toAccount.accountName'), 'accountNameTo'],
      ],
    });

    // Extract account data from the results for both fromAccount and toAccount
    const accountData = [];

    loans.forEach(loan => {
      // Add fromAccount data if it exists
      if (loan.dataValues.accountNumber && loan.dataValues.institutionName && loan.dataValues.accountName) {
        accountData.push({
          accountNumber: loan.dataValues.accountNumber,
          institutionName: loan.dataValues.institutionName,
          accountName: loan.dataValues.accountName,
        });
      }

      // Add toAccount data if it exists
      if (loan.dataValues.accountNumberTo && loan.dataValues.institutionNameTo && loan.dataValues.accountNameTo) {
        accountData.push({
          accountNumber: loan.dataValues.accountNumberTo,
          institutionName: loan.dataValues.institutionNameTo,
          accountName: loan.dataValues.accountNameTo,
        });
      }
    });

    // Remove duplicates based on accountNumber, institutionName, and accountName
    const uniqueAccounts = accountData.filter((value, index, self) => 
      index === self.findIndex((t) => (
        t.accountNumber === value.accountNumber &&
        t.institutionName === value.institutionName &&
        t.accountName === value.accountName
      ))
    );

    // Send response with distinct account data
    res.status(200).json({
      success: true,
      accountsData: uniqueAccounts,
    });
  } catch (error) {
    console.error('Error fetching accounts data:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching account data',
    });
  }
};

// const getUserDataForStatus = async(req,res) =>{
//   const { userId } = req.params;
//   try {
//     // Fetch user data with associated loans
//     const user = await User.findOne({
//       where: { id: userId },
//       include: [
//         {
//           model: Loan,
//           as: 'loans',
//           attributes: [
//             'id',
//             'amount',
//             'repaymentTerm',
//             'status',
//             'fromAccount',
//             'toAccount',
//             'interest',
//             'riskLevel',
//             'riskScore',
//             'loanrequested',
//             'isLoanComplete',
//             "dueDate",
//             'createdAt',
//           ], // Include only the necessary fields
//         },
//       ],
//     });

//     // Check if user exists
//     if (!user) {
//       return res.status(404).json({
//         success: false,
//         message: 'User not found',
//       });
//     }

//     // Send the user data with associated loans
//     res.status(200).json({
//       success: true,
//       user,
//     });
//   } catch (error) {
//     console.error('Error fetching user data:', error);
//     res.status(500).json({
//       success: false,
//       message: 'Failed to fetch user data',
//       error: error.message,
//     });
//   }
// }

const getUserDataForStatus = async (req, res) => {
  const { userId } = req.params;
  try {
    // Fetch user data with associated loans and transactions
    const user = await User.findOne({
      where: { id: userId },
      include: [
        {
          model: Loan,
          as: "loans",
          attributes: [
            "id",
            "amount",
            "repaymentTerm",
            "status",
            "fromAccount",
            "toAccount",
            "interest",
            "riskLevel",
            "riskScore",
            "loanrequested",
            "isLoanComplete",
            "dueDate",
            "createdAt"
          ], // ✅ Removed "transactions" from attributes

          include: [
            {
              model: Transaction,
              as: "transactions", // ✅ Ensure alias matches your association
              attributes: [
                "id",
                "user_id",
                "loan_id",
                "stripe_payment_id",
                "amount",
                "status",
                "payment_date",
                "emi_no",
                "fine_email_sent"
              ],
              required: false, // ✅ Allow loans with no transactions
              where: { status: { [Op.ne]: "failed" } }, // ✅ Exclude failed transactions
            },
          ],
        },
      ],
    });

    // Check if user exists
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Send the user data with associated loans and transactions
    res.status(200).json({
      success: true,
      user,
    });
  } catch (error) {
    console.error("Error fetching user data:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch user data",
      error: error.message,
    });
  }
};

const getUsersWithLoans = async (req, res) => {
  try {
    const {
      page = 1,
      loanStatus,
      loanMinAmount,
      loanMaxAmount,
      accountNumber,
      institutionName,
      accountName,
      searchQuery,
    } = req.query;

    const usersPerPage = 10;
    const offset = (page - 1) * usersPerPage;

    let loanFilter = {};
    if (loanStatus) loanFilter.status = loanStatus;
    if (loanMinAmount && loanMaxAmount) {
      loanFilter.amount = { [Op.between]: [loanMinAmount, loanMaxAmount] };
    }

    let userWhereCondition = {};
    let loanIdFilter = {};

    if (searchQuery) {
      if (!isNaN(searchQuery)) {
        loanIdFilter.id = searchQuery;
      } else {
        userWhereCondition[Op.or] = [
          { firstName: { [Op.iLike]: `%${searchQuery}%` } },
          { lastName: { [Op.iLike]: `%${searchQuery}%` } },
          { email: { [Op.iLike]: `%${searchQuery}%` } },
          Sequelize.literal(`CONCAT("firstName", ' ', "lastName") ILIKE '%${searchQuery}%'`),
        ];
      }
    }

    let loanUserIds = [];
    if (Object.keys(loanFilter).length > 0 || Object.keys(loanIdFilter).length > 0) {
      const loans = await Loan.findAll({
        attributes: ["userId"],
        where: { ...loanFilter, ...loanIdFilter },
        group: ["userId"],
      });
      loanUserIds = loans.map((loan) => loan.userId);
    }

    if (loanUserIds.length > 0) {
      userWhereCondition.id = { [Op.in]: loanUserIds };
    }

    const users = await User.findAndCountAll({
      where: userWhereCondition,
      include: [
        {
          model: Loan,
          as: "loans",
          where: { ...loanFilter, ...loanIdFilter },
          required: Object.keys(loanFilter).length > 0 || Object.keys(loanIdFilter).length > 0,
          include: [
            {
              model: Transaction, // ✅ Fetch transactions within loans
              as: "transactions",
              attributes: ["id", "user_id", "loan_id", "stripe_payment_id", "amount", "status", "payment_date", "emi_no", "fine_email_sent"],
              required: false,
              where: {
                status: { [Op.ne]: "failed" }, // ✅ Exclude failed transactions
              },
            },
          ],
        },
        {
          model: PlaidUser,
          as: "plaidUser",
          attributes: [
            "kyc_status",
            "kyc_details",
            "anti_fraud_status",
            "anti_fraud_details",
            "regulatory_status",
            // "regulatory_details",
            // "documentary_verification",
            "plaid_idv_status",
            // "most_recent_idv_session_id",
            // "watchlist_screening_id",
          ],
          required: false,
          on: Sequelize.literal(`"User"."id" = CAST("plaidUser"."user_id" AS INTEGER)`) // ✅ Convert `user_id` to INTEGER in JOIN
        },
      ],
      limit: usersPerPage,
      offset,
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      users: users.rows,
      totalPages: Math.ceil(users.count / usersPerPage),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({ success: false, message: "Failed to fetch users" });
  }
};
const getAllUsersWithLoans = async (req, res) => {
  try {
    const { page = 1, limit = 10, searchQuery } = req.query;
    const offset = (page - 1) * limit;

    const searchQueryDecoded = searchQuery
      ? decodeURIComponent(searchQuery).trim()
      : null;

    const isLoanIdSearch = searchQueryDecoded && !isNaN(searchQueryDecoded);

    // User search conditions (first name, last name, email)
    const userWhereConditions = isLoanIdSearch
      ? {} // If searching by loan ID, no need for user filters
      : searchQueryDecoded
      ? {
          [Op.or]: [
            { firstName: { [Op.iLike]: `%${searchQueryDecoded}%` } },
            { lastName: { [Op.iLike]: `%${searchQueryDecoded}%` } },
            { email: { [Op.iLike]: `%${searchQueryDecoded}%` } },
            Sequelize.literal(
              `CONCAT("firstName", ' ', "lastName") ILIKE '%${searchQueryDecoded}%'`
            ),
          ],
        }
      : {};

    // Loan search conditions (EXACT loan ID match)
    const loanWhereConditions = isLoanIdSearch
      ? { id: { [Op.eq]: searchQueryDecoded } }
      : {};

    // Query users with loan conditions & PlaidUser data
    const users = await User.findAndCountAll({
      where: userWhereConditions,
      limit: parseInt(limit),
      offset,
      include: [
        {
          model: Loan,
          as: "loans",
          where: loanWhereConditions, // Only apply loan filter when searching by ID
          attributes: ["id", "amount", "riskLevel", "riskScore", "status", "fromAccount", "toAccount","interest", "repaymentTerm", "isLoanComplete", "dueDate","createdAt"],
          required: isLoanIdSearch, // Inner join when loan ID is provided
          include: [
            {
              model: Transaction, // ✅ Fetch transactions within loans
              as: "transactions",
              attributes: ["id", "user_id", "loan_id", "stripe_payment_id", "amount", "status", "payment_date", "emi_no", "fine_email_sent"],
              required: false,
              where: {
                status: { [Op.ne]: "failed" }, // ✅ Exclude failed transactions
              },
            },
          ],
        },
       
        {
          model: PlaidUser,
          as: "plaidUser",
          attributes: [
            "kyc_status",
            "kyc_details",
            "anti_fraud_status",
            "anti_fraud_details",
            "regulatory_status",
            // "regulatory_details",
            // "documentary_verification",
            "plaid_idv_status",
            // "most_recent_idv_session_id",
            // "watchlist_screening_id",
          ],
          required: false, // Use LEFT JOIN to include users even if they don't have PlaidUser data
          on: Sequelize.literal(`"User"."id" = CAST("plaidUser"."user_id" AS INTEGER)`) // ✅ Fix data type mismatch
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json({
      success: true,
      users: users.rows,
      totalItems: users.count,
      totalPages: Math.ceil(users.count / limit),
      currentPage: parseInt(page),
    });
  } catch (error) {
    console.error("Error fetching users:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch users",
      error: error.message,
    });
  }
};

// Admin dashboard controller (requires authentication and admin role)
const adminDashboard = (req, res) => {
  return res.json({ message: messages?.ADMIN_DASHBOARD });
};

const getUserRegistrations = async (req, res) => {
  try {
      const query = `
          SELECT 
              TO_CHAR("createdAt", 'Mon YYYY') AS month, 
              COUNT(*) AS users
          FROM "Users"
          WHERE "createdAt" >= '2024-01-01'
          GROUP BY month
          ORDER BY MIN("createdAt");
      `;

      const userRegistrations = await sequelize.query(query, {
          type: sequelize.QueryTypes.SELECT,
      });

      res.json({ success: true, data: userRegistrations });
  } catch (error) {
      console.error("Error fetching user registrations:", error);
      res.status(500).json({ success: false, message: "Internal Server Error" });
  }
};



module.exports = {
  adminLogin,handleOTPAndProfileUpdate,getUserDataForStatus,AdminGraphLoanDetails,AdminTransactionGraphData,
  adminDashboard,getUsersWithLoans,upload,getAdminProfile,changePassword,forgotPassword,resetPassword,getAllUsersWithLoans,getFilterData,getUserRegistrations
};
