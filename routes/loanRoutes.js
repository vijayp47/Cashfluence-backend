// routes/loanRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateUser, authenticateAdmin } = require('../middleware/authMiddleware');
const {applyForLoan,getAllLoans, updateLoanStatus, getLoanDetails,checkPendingPayments } = require('../controllers/loanController');

// User route to submit a loan application
router.post('/apply', authenticateUser, applyForLoan);

// Admin route to get all loan applications
router.get('/all', authenticateAdmin, getAllLoans);

// Admin route to update loan status
router.patch('/:id', authenticateAdmin,updateLoanStatus);

router.get('/:loanId/pending-status', checkPendingPayments);


// Admin route to get loan details by ID
router.get('/:id', authenticateUser, getLoanDetails);
module.exports = router;