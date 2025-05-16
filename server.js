const dotenv = require("dotenv");

const express = require("express");

const cors = require("cors");
const path = require("path");
const session = require("express-session");
require("./models/association"); 

// Initialize express app
const app = express();

// Load environment variables
dotenv.config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
// Setup session middleware
app.use(session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: process.env.NODE_ENV === "production",
    maxAge: 3600000,
  }
}));

// Enable CORS for frontend domain
app.use(cors({
  origin: process.env.baseUrl,
  credentials: true,
}));


// Import database connection functions
const { connectDB, syncDB } = require("./config/db");

// Import routes
const authRoutes = require("./routes/authRoutes");
const kycRoutes = require("./routes/kycRoutes");
const phylloRoutes = require("./routes/phylloRoute");
const plaidRoutes = require("./routes/plaidRoute");
const loanRoutes = require("./routes/loanRoutes");
const adminRoutes = require("./routes/adminRoutes");
const messages = require("./constants/Messages");
const paymentRoutes = require("./routes/paymentRoutes");
const stripeRoutes = require("./routes/stripeRoutes");
const weightRoutes = require("./routes/weightRoutes");
const recipientRoutes =require("./routes/recipientRoutes");
// Ensure webhook request is NOT parsed as JSON
app.use((req, res, next) => {
  if (req.originalUrl === "/api/stripe/webhook") {
    next(); // Skip body-parser for webhook
  } else {
    express.json()(req, res, next);
  }
});

// Serve static uploads folder
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// Register API routes
app.use("/api/auth", authRoutes);
app.use("/api/kyc", kycRoutes);
app.use("/api/phyllo", phylloRoutes);
app.use("/api/loans", loanRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/payment", paymentRoutes);
app.use("/api/stripe", stripeRoutes); 
app.use("/api/plaid", plaidRoutes);
app.use("/api/weight", weightRoutes);
app.use('/api/recipient', recipientRoutes);
app.get("/payment/success", (req, res) => {
  res.sendFile(path.join(__dirname, "views/success.html"));
});




// require("./config/cronJobs");


// Payment Cancel Route
app.get("/payment/cancel", (req, res) => {
  res.sendFile(path.join(__dirname, "views/cancel.html"));
});

app.get("/retry-payment", async (req, res) => {
  let { session_id, loan_id, emi_amount, user_id } = req.query; // ✅ Extract user_id

  if (!session_id || !loan_id || !user_id) {
    return res.status(400).json({ error: "Missing session_id, loan_id, or user_id" });
  }

  try {

    // Retrieve existing Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session && session.payment_status === "unpaid") {
      return res.redirect(session.url);
    }
    const emiAmountCents = emi_amount ? parseFloat(emi_amount) * 100 : 5000;
   //  Create a new checkout session
    const newSession = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "Loan EMI Payment" },
            unit_amount: emiAmountCents,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url:`${process.env.BASE_URL}/payment/success?session_id=${newSession.id}&loan_id=${loan_id}&user_id=${user_id}`,
      cancel_url:`${process.env.BASE_URL}/payment/cancel?loan_id=${loan_id}&emiAmount=${emi_amount}`,
      metadata: { user_id, loan_id }, //  Include user_id
    });

    console.log("New session created:", newSession.url);

    return res.redirect(newSession.url);
  } catch (error) {
    console.error("Error in retry-payment:", error);
    res.status(500).json({ error: error.message });
  }
});



app.post('/straddle-payoutstatus-webhook', (req, res) => {
  console.log('Webhook received!');
  console.log('Headers:', req.headers);
  console.log('Body:', JSON.stringify(req.body, null, 2));

  // Example: Extract payout status
  const payoutStatus = req.body.data?.status;
  const payoutId = req.body.data?.id;

  console.log(`Payout ID: ${payoutId}, Status: ${payoutStatus}`);

  // Respond with 200 OK to acknowledge receipt
  res.status(200).send('Webhook received');
});


app.post('/straddle-webhook', (req, res) => {
    console.log("Webhook payload received:");
    console.log(JSON.stringify(req.body, null, 2)); // Pretty print the data
    res.status(200).send('OK');
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: messages?.ERROR });
});

// 404 handler for undefined routes
app.use((req, res, next) => {
  res.status(404).json({ error: messages?.NOTFOUND });
});

// Function to start the server
const startServer = async () => {
  try {
    // Connect to the database
    await connectDB();

    // Sync database models (creates tables if they don't exist)
    await syncDB();

    // Start the server only after DB connection and syncing
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`${messages?.SERVER_PORT} ${PORT}`);
    });
  } catch (err) {
    console.error(messages?.DB_CONNECTION_ERROR, err);
    process.exit(1);
  }
};

// Start the server
startServer();

