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
  prefillUserData,getPlaidUserState,getAverageBalance,deleteAccountDetails,deleteBankDetails,fetchRegultoryData,getPlaidProcessTokenByUserId,getIdentityDataByAccountId
} = require('../controllers/plaidController');



const {
  createACHLinkToken,
} = require('../controllers/ACHPlaid');
// Define Routes
router.post('/public_token', authenticateUser, plaidPublicToken);
router.post('/create_link_token', authenticateUser, createLinkToken);
router.post('/liabilities', authenticateUser, getLiabilities);
router.post('/transaction', authenticateUser, getTransactions);
router.get('/accountdata',authenticateUser, getUserAccountData);
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
router.post('/average-balance', authenticateUser, getAverageBalance);
router.delete('/delete-account', authenticateUser, deleteAccountDetails);
router.delete('/delete-bank', authenticateUser, deleteBankDetails);
router.get('/plaid-user/:user_id/process-token', authenticateUser, getPlaidProcessTokenByUserId);
router.get('/account/:accountId/identity-data', authenticateUser, getIdentityDataByAccountId);
// router.get('/regulatory-requirements/:sessionId',fetchRegultoryData)

module.exports = router;





