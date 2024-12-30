// // server.js (or app.js)
// const express = require('express');
// const dotenv = require('dotenv');
// const cors = require('cors');
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



// const authRoutes = require('./routes/authRoutes');
// const kycRoutes = require('./routes/kycRoutes');
// const phylloRoutes = require('./routes/phylloRoute');
// const plaidRoutes = require('./routes/plaidRoute');
// const loanRoutes = require('./routes/loanRoutes'); // Import loan routes
// const { connectDB, syncDB } = require('./config/db'); // Import connectDB and syncDB functions
// const adminRoutes = require("./routes/adminRoutes");
// const messages = require('./constants/Messages');
// const path = require('path');

// app.use('/uploads', (req, res, next) => {

//   next();
// }, express.static(path.join(__dirname, 'uploads')));

// // Register routes
// app.use('/api/auth', authRoutes);
// app.use('/api/kyc', kycRoutes);
// app.use('/api/phyllo', phylloRoutes);
// app.use('/api/loans', loanRoutes);
// app.use('/api/admin', adminRoutes);

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


// server.js
const express = require('express');
const dotenv = require('dotenv');
const cors = require('cors');
const session = require('express-session');
const PgSession = require('connect-pg-simple')(session);
const { Pool } = require('pg');
const path = require('path');
const messages = require('./constants/Messages');

// Load environment variables
dotenv.config();

// Initialize express app
const app = express();

// Middleware to parse JSON
app.use(express.json());

// PostgreSQL connection pool for sessions
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Allow SSL connection
  },
});

// Setup session middleware
app.use(
  session({
    store: new PgSession({ pool }),
    secret: process.env.SESSION_SECRET, // Secret key for sessions
    resave: false, // Do not resave session data if not modified
    saveUninitialized: false, // Do not save uninitialized sessions
    cookie: {
      secure: process.env.NODE_ENV === 'production', // Secure cookies in production
      httpOnly: true, // Prevent client-side JavaScript from accessing cookies
      maxAge: 3600000, // 1 hour cookie expiry
    },
  })
);

// CORS configuration
const corsOptions = {
  origin: process.env.baseUrl || "https://cashfluence-frontend.vercel.app", // Frontend URL
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true, // Allow cookies and credentials
};

// Apply CORS middleware globally
app.use(cors(corsOptions));

// Handle preflight OPTIONS requests explicitly
app.options('*', (req, res) => {
  res.header("Access-Control-Allow-Origin", process.env.baseUrl || "https://cashfluence-frontend.vercel.app");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.header("Access-Control-Allow-Credentials", "true");
  res.sendStatus(204);
});

// Static file handling
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const authRoutes = require('./routes/authRoutes');
const kycRoutes = require('./routes/kycRoutes');
const phylloRoutes = require('./routes/phylloRoute');
const plaidRoutes = require('./routes/plaidRoute');
const loanRoutes = require('./routes/loanRoutes');
const adminRoutes = require('./routes/adminRoutes');

// Register routes
app.use('/api/auth', authRoutes);
app.use('/api/kyc', kycRoutes);
app.use('/api/phyllo', phylloRoutes);
app.use('/api/loans', loanRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/plaid', plaidRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ error: messages?.ERROR || 'Internal server error' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: messages?.NOTFOUND || 'Not found' });
});

// Function to start the server
const startServer = async () => {
  try {
    const { connectDB, syncDB } = require('./config/db');

    // Connect to the database
    await connectDB();

    // Sync database models
    await syncDB();

    // Start the server
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(messages?.SERVER_PORT || `Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error(messages?.DB_CONNECTION_ERROR || 'Failed to start server:', err);
    process.exit(1);
  }
};

// Start the server
startServer();
