// routes/authRoutes.js
const express = require('express');
const { registerUser, loginUser,verifyOtp,getTermsAcceptanceStatus,forgotPassword,termsAcceptsStausUpdate,resetPassword,contactSupport,getUserProfile,resendOtp,upload,changePassword,handleOTPAndUserProfileUpdate,updateOneTimePaymentIdentityStatus} = require('../controllers/authController');
const router = express.Router();
const {authenticateUser} =require("../middleware/authMiddleware");
// Register route
router.post('/register', registerUser);

// Login route
router.post('/login', loginUser);
router.post('/verify-otp',verifyOtp);
router.post('/resend-otp',resendOtp);

router.get('/profile',authenticateUser, getUserProfile);
// Forgot Password route
router.post('/forgot-password', forgotPassword);
// Reset Password route (with token)
router.post('/reset-password/:token', resetPassword);
router.post('/contact',authenticateUser, contactSupport);
router.post('/change-password', authenticateUser,changePassword);
router.post('/update-identity-payment-status', authenticateUser,updateOneTimePaymentIdentityStatus);
router.post('/update-terms-accept-status', authenticateUser,termsAcceptsStausUpdate);
router.get('/get-terms-status', authenticateUser, getTermsAcceptanceStatus);

router.put('/profile-update',upload?.single('image'), handleOTPAndUserProfileUpdate);
module.exports = router;
