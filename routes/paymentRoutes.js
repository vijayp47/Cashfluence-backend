const express = require("express");
const router = express.Router();
const { createPaymentIntent,retryPayment } = require("../controllers/paymentController");

router.post("/create-payment-intent", createPaymentIntent);
router.get("/retry-payment", retryPayment);
module.exports = router;
