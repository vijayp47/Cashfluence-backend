// tokenPhylloRoute.js
const express = require('express');
const { createPhylloUser,createPhylloSDKToken,fetchPhylloPlatforms,fetchanSocialAccount,fetchStateLawFromDatabase ,fetchDataFromdatabaseAdmin,fetchDataFromdatabase,deletePlatformData} = require('../controllers/phylloController');
const {authenticateUser,authenticateAdmin} =require("../middleware/authMiddleware");

const router = express.Router();

// Define the POST route for creating a Phyllo user
router.post('/create-user',authenticateUser, createPhylloUser);
router.post('/sdk-token',authenticateUser, createPhylloSDKToken);
router.get('/platforms',authenticateUser, fetchPhylloPlatforms);
router.get('/social/accounts',authenticateUser, fetchanSocialAccount);
router.get('/fetchDataFromdatabase',authenticateUser, fetchDataFromdatabase);
router.get('/fetchDataFromdatabaseadmin',authenticateAdmin, fetchDataFromdatabaseAdmin);
router.delete('/deletePlatformData', authenticateUser,deletePlatformData);
router.get('/fetchStateAnnualPercentageRate', authenticateUser,fetchStateLawFromDatabase);
// router.get('/risk-score',authenticateUser,getRiskScore);

// router.get('/social/contents', getContent);
// router.get('/social/comments', getComments);
// router.get('/social/income/transactions', getSocialTrasactionOfParticularAccount);
module.exports = router;
