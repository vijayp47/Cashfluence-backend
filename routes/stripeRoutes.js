const express = require("express");
const { stripeWebhook ,getTransactionsByUserAndLoan,checkTransaction} = require("../controllers/stripeController");

const router = express.Router();

// Webhook Route for Stripe
router.post("/webhook", express.raw({ type: "application/json" }), stripeWebhook);
router.get("/repayment-transactions",  getTransactionsByUserAndLoan);
router.get("/check-transaction",  checkTransaction);

module.exports = router;
