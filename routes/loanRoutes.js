// routes/loanRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateUser, authenticateAdmin } = require('../middleware/authMiddleware');
const {applyForLoan,getAllLoans, updateLoanStatus,processScheduledJobs,cronJob, getLoanDetails,checkPendingPayments,loanCompletedStatus,loanDuration } = require('../controllers/loanController');

// User route to submit a loan application
router.post('/apply', authenticateUser, applyForLoan);
// Register route
router.get("/process-scheduled-jobs", processScheduledJobs);
// Admin route to get all loan applications
router.get('/all', authenticateAdmin, getAllLoans);
router.get('/cron-job',cronJob);
// Admin route to update loan status
router.post('/:id', authenticateAdmin,updateLoanStatus);

router.get('/:loanId/pending-status', checkPendingPayments);
router.post('/loanstatus/:loanId', loanCompletedStatus);

router.get("/loan-durations", loanDuration);

// Admin route to get loan details by ID
router.get('/:id', authenticateUser, getLoanDetails);
module.exports = router;
