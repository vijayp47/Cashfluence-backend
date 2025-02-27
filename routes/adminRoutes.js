// routes/adminRoutes.js

const express = require('express');
const router = express.Router();
const { adminLogin,adminDashboard,getUsersWithLoans,getUserDataForStatus,handleOTPAndProfileUpdate,getAllUsersWithLoans,getFilterData,upload,getAdminProfile,changePassword,forgotPassword,resetPassword,getUserRegistrations,AdminGraphLoanDetails,AdminTransactionGraphData} = require('../controllers/adminController');
const { authenticateAdmin } = require('../middleware/authMiddleware'); // Import the middleware

// Route for admin login
router.post('/login', adminLogin);
router.put('/profile-update',upload.single('image'), handleOTPAndProfileUpdate);
router.get('/profile',authenticateAdmin, getAdminProfile);
router.post('/change-password', authenticateAdmin,changePassword);
router.get('/dashboard', authenticateAdmin, adminDashboard);
router.get('/users', authenticateAdmin, getUsersWithLoans);
router.get('/allusers', authenticateAdmin, getAllUsersWithLoans);
router.get('/filter-data',authenticateAdmin,getFilterData)

router.post('/forgot-password',authenticateAdmin, forgotPassword);
// Reset Password route (with token)
router.post('/reset-password/:token',authenticateAdmin, resetPassword);
router.get('/user/:userId',authenticateAdmin,getUserDataForStatus);
router.get("/user-registrations",authenticateAdmin, getUserRegistrations);
router.get('/loan-graph',authenticateAdmin,AdminGraphLoanDetails)
router.get('/transaction-graph',authenticateAdmin,AdminTransactionGraphData)
// /api/admin/profile
module.exports = router;

