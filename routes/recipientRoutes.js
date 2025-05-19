// routes/recipientRoutes.js

const express = require('express');
const router = express.Router();
const { handleProcessorTokenCreation,saveProcessToken,approveLoanAndCreateCustomer } = require('../controllers/recipientController');
const { authenticateUser, authenticateAdmin } = require("../middleware/authMiddleware");
// Route to create a recipient
router.post('/create-processor-token',authenticateUser,handleProcessorTokenCreation);
router.post("/save-process-token",authenticateUser, saveProcessToken);
router.post("/create-customer-payout",authenticateAdmin,  approveLoanAndCreateCustomer);
module.exports = router;



