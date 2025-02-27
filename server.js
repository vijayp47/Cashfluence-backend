// // server.js (or app.js)
// const express = require('express');
// const dotenv = require('dotenv');
// const cors = require('cors');
// const path = require('path');
// const session = require('express-session');
// // Initialize express app
// const app = express();

// // Load environment variables
// dotenv.config();

// // Middleware to parse JSON and handle session
// app.use(express.json()); // Middleware to parse JSON

// // Setup session middleware
// app.use(session({
//   secret: process.env.SESSION_SECRET, // Use the secret from .env
//   resave: false, // Don't force session to be saved back to the store if nothing has changed
//   saveUninitialized: true, // Create a session even if the user has not authenticated
//   cookie: {
//     secure: process.env.NODE_ENV === 'production', // Use secure cookies in production (HTTPS required)
//     maxAge: 3600000,
//   }
// }));

// // Enable CORS for frontend domain
// app.use(cors({
//   origin:  process.env.baseUrl, // Replace with frontend URL
//   credentials: true,
// }));


// const { connectDB, syncDB } = require('./config/db'); // Import connectDB and syncDB functions
// const authRoutes = require('./routes/authRoutes');
// const kycRoutes = require('./routes/kycRoutes');
// const phylloRoutes = require('./routes/phylloRoute');
// const plaidRoutes = require('./routes/plaidRoute');
// const loanRoutes = require('./routes/loanRoutes'); // Import loan routes
// const adminRoutes = require("./routes/adminRoutes");
// const messages = require('./constants/Messages');
// const paymentRoutes = require("./routes/paymentRoutes");
// const stripeRoutes = require("./routes/stripeRoutes"); 

// app.use('/uploads', (req, res, next) => {

//   next();
// }, express.static(path.join(__dirname, 'uploads')));


// app.use((req, res, next) => {
//   if (req.originalUrl === "/webhook") {
//       next(); // Skip body-parser for webhook
//   } else {
//       express.json()(req, res, next);
//   }
// });

// // Register routes
// app.use('/api/auth', authRoutes);
// app.use('/api/kyc', kycRoutes);
// app.use('/api/phyllo', phylloRoutes);
// app.use('/api/loans', loanRoutes);
// app.use('/api/admin', adminRoutes);
// // Use Payment Routes
// app.use("/api/payment", paymentRoutes);
// app.use("/api/stripe", stripeRoutes);
// app.use('/api/plaid', plaidRoutes);
// // Error handling middleware
// app.use((err, req, res, next) => {
//   console.error(err.stack);
//   res.status(500).json({ error: messages?.ERROR  });
// });

// // 404 handler for undefined routes
// app.use((req, res, next) => {
//   res.status(404).json({ error: messages?.NOTFOUND});
// });


// // Function to start the server
// const startServer = async () => {
//   try {
//     // Connect to the database
//     await connectDB();

//     // Sync database models (creates tables if they don't exist)
//     await syncDB();

//     // Start the server only after DB connection and syncing
//     const PORT = process.env.PORT || 3000;
//     app.listen(PORT, () => {
//       console.log(`${messages?.SERVER_PORT} ${PORT}`);
//     });
//   } catch (err) {
//     console.error(messages?.DB_CONNECTION_ERROR, err);
//     process.exit(1);
//   }
// };

// // Start the server
// startServer();
const stripe = require("stripe")(
  "sk_test_51QsM5MKGv97rduY5XuQLF5I6RTF6Xo3QPIPybmpJMbJXE1JFrehd21joSRpNtJVESgQ6vFqdWwCFyoIcG4PGJjU500xNty4f3i"
);
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");
const session = require("express-session");
require("./models/association"); 

// Initialize express app
const app = express();

// Load environment variables
dotenv.config();

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

// ✅ Ensure webhook request is NOT parsed as JSON
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
app.get("/payment/success", (req, res) => {
  res.sendFile(path.join(__dirname, "views/success.html"));
});

require("./config/cronJobs");

// Payment Cancel Route
app.get("/payment/cancel", (req, res) => {
  res.sendFile(path.join(__dirname, "views/cancel.html"));
});

app.get("/retry-payment", async (req, res) => {
  let { session_id, loan_id, emi_amount, user_id } = req.query; // ✅ Extract user_id
  console.log("emi_amount", emi_amount);

  if (!session_id || !loan_id || !user_id) {
    return res.status(400).json({ error: "Missing session_id, loan_id, or user_id" });
  }

  try {
    console.log("🔄 Retrieving Stripe session:", session_id);

    // ✅ Retrieve existing Stripe session
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session && session.payment_status === "unpaid") {
      console.log("✅ Redirecting to existing session:", session.url);
      return res.redirect(session.url);
    }

    console.log("⚠️ Session expired. Creating a new session...");

    const emiAmountCents = emi_amount ? parseFloat(emi_amount) * 100 : 5000;
    console.log("✅ Final EMI Amount (cents):", emiAmountCents);

    // ✅ Create a new checkout session
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
      success_url: `http://localhost:3000/payment/success?session_id=${newSession.id}&loan_id=${loan_id}&user_id=${user_id}`,
      cancel_url: `http://localhost:3000/payment/cancel?loan_id=${loan_id}&emiAmount=${emi_amount}`,
      metadata: { user_id, loan_id }, // ✅ Include user_id
    });

    console.log("✅ New session created:", newSession.url);

    return res.redirect(newSession.url);
  } catch (error) {
    console.error("❌ Error in retry-payment:", error);
    res.status(500).json({ error: error.message });
  }
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

