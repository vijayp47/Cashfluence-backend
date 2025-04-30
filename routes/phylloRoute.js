// tokenPhylloRoute.js
const express = require('express');
const { createPhylloUser,createPhylloSDKToken,fetchPhylloPlatforms,fetchanSocialAccount,fetchStateLawFromDatabase ,fetchDataFromdatabaseAdmin,fetchDataFromdatabase,deletePlatformData,fetchConnectedAccountNames} = require('../controllers/phylloController');
const {authenticateUser,authenticateAdmin} =require("../middleware/authMiddleware");

const router = express.Router();

// Define the POST route for creating a Phyllo user
router.post('/create-user',authenticateUser, createPhylloUser);
router.post('/sdk-token',authenticateUser, createPhylloSDKToken);
router.get('/platforms',authenticateUser, fetchPhylloPlatforms);
router.get('/social/accounts',authenticateUser, fetchanSocialAccount);
router.get('/fetchDataFromdatabase',authenticateUser, fetchDataFromdatabase);
router.get('/fetchDataFromdatabaseadmin',authenticateAdmin, fetchDataFromdatabaseAdmin);
router.post('/deletePlatformData',deletePlatformData);
router.get('/fetchStateAnnualPercentageRate', authenticateUser,fetchStateLawFromDatabase);
router.get('/connected-platforms/:userId',authenticateUser,fetchConnectedAccountNames);
// router.post('/remove-account',authenticateUser, disconnectAccountAndDeleteData);
module.exports = router;
