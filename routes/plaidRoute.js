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
  prefillUserData,getPlaidUserState,getBankAccountData,getAverageBalance,deleteAccountDetails,deleteBankDetails
} = require('../controllers/plaidController');



const {
  createACHLinkToken,
  exchangePublicToken,
  createTransferAuthorization,
} = require('../controllers/ACHPlaid');
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
router.post('/plaid_user_state', authenticateUser, getPlaidUserState);
router.post('/ach_create_link_token', createACHLinkToken);
router.post('/exchange_public_token', exchangePublicToken);
router.post('/create_transfer', createTransferAuthorization);
router.get('/bank_data',getBankAccountData);
router.post('/average-balance', authenticateUser, getAverageBalance);
router.delete('/delete-account', authenticateUser, deleteAccountDetails);
router.delete('/delete-bank', authenticateUser, deleteBankDetails);
module.exports = router;





