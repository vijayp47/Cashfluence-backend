// routes/loanRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateUser, authenticateAdmin } = require('../middleware/authMiddleware');
const {applyForLoan,getAllLoans, updateLoanStatus, getLoanDetails,loanCompletedStatus,loanDuration,getAllLoanOfSpecificUser } = require('../controllers/loanController');

// User route to submit a loan application
router.post('/apply', authenticateUser, applyForLoan);
router.get('/all', authenticateAdmin, getAllLoans);
router.post('/:id', authenticateAdmin,updateLoanStatus);
router.post('/loanstatus/:loanId', loanCompletedStatus);
router.get("/loan-durations",authenticateUser, loanDuration);
router.get('/:id', authenticateUser, getLoanDetails);
router.get('/user/:userId', authenticateUser,getAllLoanOfSpecificUser);
module.exports = router;
