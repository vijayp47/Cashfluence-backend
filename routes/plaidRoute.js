const express = require('express');
const router = express.Router();

// Import Middleware
const { authenticateUser, authenticateAdmin } = require("../middleware/authMiddleware");

// Import Controllers
const {
  plaidPublicToken,
  createLinkToken,
  getLiabilities,
  getTransactions,
  getUserAccountData,
  getRiskScoreController,
  idvPlaidToken,
  clearOldSessions,
  getPlaidUserData,
  plaidIDVComplete,
  PlaidResetIdv,
  getpliadUserIdvStauts,
  prefillUserData
} = require('../controllers/plaidController');

// Define Routes
router.post('/public_token', authenticateUser, plaidPublicToken);
router.post('/create_link_token', authenticateUser, createLinkToken);
router.post('/liabilities', authenticateUser, getLiabilities);
router.post('/transaction', authenticateUser, getTransactions);
router.get('/accountdata', getUserAccountData);
router.post('/riskscore', authenticateUser, getRiskScoreController);
router.post('/generate_link_token_for_idv', authenticateUser, idvPlaidToken);
router.post('/idv_complete', authenticateUser, plaidIDVComplete);
router.post('/clear_old_sessions', authenticateUser, clearOldSessions);
router.post('/get-plaid-user', authenticateAdmin, getPlaidUserData);
router.post('/retry-idv', authenticateUser, PlaidResetIdv);
router.post('/user-idvStatus', authenticateUser, getpliadUserIdvStauts);
router.post('/prefill_idv_data', authenticateUser, prefillUserData);

module.exports = router;
