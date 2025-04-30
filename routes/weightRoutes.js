// routes/weightRoutes.js
const express = require("express");
const { getWeights, updateWeights } = require("../controllers/weightController");
const { authenticateUser, authenticateAdmin } = require("../middleware/authMiddleware");
const router = express.Router();

router.get("/weights", getWeights);
router.put("/weights",authenticateAdmin, updateWeights); // for admin to update

module.exports = router;
