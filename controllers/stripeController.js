require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;
const Loan = require("../models/Loan");
const { sequelize } = require("../config/db");

const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata.user_id;
      const loanId = session.metadata.loan_id;
      const emiNo = session.metadata.emi_no;
      await sequelize.query(
        `UPDATE "Loans" SET "dueDate" = "dueDate" + INTERVAL '1 month' WHERE "id" = :loanId`,
        { replacements: { loanId }, type: sequelize.QueryTypes.UPDATE }
      );
      await sequelize.query(
        `INSERT INTO transactions (user_id, loan_id, stripe_payment_id, amount, payment_date, status, emi_no) 
         VALUES (:userId, :loanId, :stripePaymentId, :amountPaid, NOW(), 'completed', :emiNo)`,
        { replacements: { userId, loanId, stripePaymentId: session.payment_intent, amountPaid: session.amount_total / 100, emiNo }, type: sequelize.QueryTypes.INSERT }
      );
      await Loan.update({ overdueStatus: null }, { where: { id: loanId } });
    }
    res.status(200).send("Webhook processed successfully.");
  } catch (error) {
    res.status(400).send(`Webhook error: ${error.message}`);
  }
};

//  Get Transactions by User ID and Loan ID
const getTransactionsByUserAndLoan = async (req = null, res = null, userId = null, loanId = null,
  emiNo) => {
  try {
      // ✅ If called via API, extract from `req.query`
      if (req) {
          userId = req.query.user_id;
          loanId = req.query.loan_id;
          emiNo = req.query.emiNo;
      }

   

      // ✅ Validate Inputs
      if (!userId || !loanId || !emiNo) {
          if (res) return res.status(400).json({ error: "user_id , loan_id and emi no are required" });
          return []; // Return empty array for internal calls
      }

      // ✅ Convert user_id & loan_id to String to match DB types
      userId = String(userId);
      emiNo = Number(emiNo);
      

      // ✅ Fetch transactions from database
      const transactions = await sequelize.query(
          `SELECT * FROM transactions WHERE user_id = CAST(:userId AS VARCHAR) AND loan_id = CAST(:loanId AS INTEGER) AND emi_no = CAST(:emiNo AS INTEGER)`,
          {
              replacements: { userId, loanId ,emiNo},
              type: sequelize.QueryTypes.SELECT,
          }
      );

      console.log("transactions------------", transactions);

      // ✅ If No Transactions Found
      if (transactions.length === 0) {
          if (res) return res.status(404).json({ message: "No transactions found" });
          return []; // Return empty array for internal calls
      }

      // ✅ If called via API, send JSON response
      if (res) {
          return res.status(200).json({ success: true, data: transactions });
      }

      return transactions; // Return transactions for internal calls
  } catch (error) {
      console.error("❌ Error fetching transactions:", error);
      if (res) return res.status(500).json({ error: "Internal Server Error" });
      return []; // Return empty array if error
  }
};


// Function to check transaction
const getTransactionByEmi = async (userId, loanId, emiNo, retries = 3, delay = 2000) => {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      console.log("🔍 Query Debug:", {
        userIdType: typeof userId, loanIdType: typeof loanId, emiNoType: typeof emiNo,
        userIdValue: `"${userId}"`, loanIdValue: `"${loanId}"`, emiNoValue: emiNo
      });

      const sqlQuery = `
        SELECT * FROM transactions 
        WHERE user_id = :userId 
        AND loan_id = :loanId 
        AND emi_no = CAST(:emiNo AS INTEGER) lo
        LIMIT 1
      `;

      console.log(`🟢 Running SQL Query: ${sqlQuery}`);
      console.log(`🟢 With Parameters:`, { 
        userId: String(userId).trim(), 
        loanId: String(loanId).trim(), 
        emiNo: Number(emiNo) // Ensure emiNo is an integer
      });

      const transaction = await sequelize.query(sqlQuery, {
        replacements: { 
          userId: String(userId).trim(), 
          loanId: String(loanId).trim(), 
          emiNo: Number(emiNo) // Convert to integer
        },
        type: sequelize.QueryTypes.SELECT,
      });

      console.log(`🔍 SQL Result:`, transaction);

      if (transaction.length > 0) {
        console.log("✅ Transaction Found:", transaction);
        return true; // Transaction exists
      } else {
        console.log("❌ No Matching Transaction Found!");
      }

      if (attempt < retries) {
        console.log(`🔄 Retrying in ${delay / 1000} seconds...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    } catch (error) {
      console.error(`❌ SQL Error:`, error);
      return false;
    }
  }

  console.log("⚠️ Returning FALSE after all attempts");
  return false;
};

// Controller function to handle API request
const checkTransaction = async (req, res) => {
  try {
    const { userId, loanId, emiNo } = req.query;

    // Validate query parameters
    if (!userId || !loanId || !emiNo) {
      return res.status(400).json({ success: false, error: "Missing required query parameters" });
    }

    // Convert query parameters to numbers for consistency
    const transactionExists = await getTransactionByEmi(Number(userId), Number(loanId), Number(emiNo));

    return res.json({ success: true, transactionExists });
  } catch (error) {
    console.error("❌ Error handling check-transaction route:", error);
    return res.status(500).json({ success: false, error: "Internal Server Error" });
  }
};

module.exports = { stripeWebhook,getTransactionsByUserAndLoan,checkTransaction,getTransactionByEmi };


