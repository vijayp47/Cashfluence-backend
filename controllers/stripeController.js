const stripe = require("stripe")(
  "sk_test_51QsM5MKGv97rduY5XuQLF5I6RTF6Xo3QPIPybmpJMbJXE1JFrehd21joSRpNtJVESgQ6vFqdWwCFyoIcG4PGJjU500xNty4f3i"
);
const cron = require("node-cron");
const nodemailer = require("nodemailer");

const {  sendDueDateReminderEmail } = require("./loanController");

const { sequelize } = require("../config/db");
// The endpoint secret from the Stripe CLI (this should be in your .env file)
const endpointSecret =
  "whsec_60d864d0f876185ef57b39d419a467a1b6e5041ff65317d4f69a46e53ea667d9";

  const getEmiNumbersByUserAndLoan = async (userId, loanId) => {
    try {
        if (!userId || !loanId) {
            throw new Error("user_id and loan_id are required");
        }

        // ✅ Fetch all EMI numbers for the given user and loan
        const emiNumbers = await sequelize.query(
            `SELECT emi_no FROM transactions WHERE user_id = :userId AND loan_id = :loanId ORDER BY emi_no ASC`,
            {
                replacements: { userId, loanId },
                type: sequelize.QueryTypes.SELECT,
            }
        );

        // ✅ Extract EMI numbers from the result
        const emiList = emiNumbers.map(row => row.emi_no);

        console.log(`📌 EMI Numbers for User ${userId}, Loan ${loanId}:`, emiList);
        return emiList; // ✅ Return array of EMI numbers
    } catch (error) {
        console.error("❌ Error fetching EMI numbers:", error);
        return []; // Return an empty array in case of error
    }
};


const stripeWebhook = async (req, res) => {
  console.log("Received Stripe Webhook");

  const sig = req.headers["stripe-signature"];
  let event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
    console.log("Webhook Event:", event);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const userId = session.metadata.user_id;
      const loanId = session.metadata.loan_id;
      const amountPaid = session.amount_total / 100;
      const stripePaymentId = session.payment_intent;
      const emiNo = session.metadata.emi_no;  
      const totalEmis = session.metadata.totalEmis;

      // ✅ Fetch payment date
      const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentId);
      const paymentDate = new Date(paymentIntent.created * 1000);

      console.log(`✅ Payment received: User ${userId}, Loan ${loanId}, EMI ${emiNo}, Amount ${amountPaid}`);

      // ✅ Insert transaction record including EMI number
      await sequelize.query(
        `INSERT INTO transactions (user_id, loan_id, stripe_payment_id, amount, payment_date, status, emi_no) 
         VALUES (:userId, :loanId, :stripePaymentId, :amountPaid, :paymentDate, :status, :emiNo)`,
        {
          replacements: { userId, loanId, stripePaymentId, amountPaid, paymentDate, status: "completed", emiNo },
          type: sequelize.QueryTypes.INSERT,
        }
      );

      // ✅ Check if previous EMI was unpaid
      const previousEmiNo = emiNo - 1;
      const previousEmiPaid = previousEmiNo > 0 ? await getTransactionByEmi(userId, loanId, previousEmiNo) : true;

      // ✅ Update loan due date
      if (emiNo <= totalEmis) {
        await sequelize.query(
          `UPDATE "Loans" 
           SET "dueDate" = "dueDate" + INTERVAL '1 month' 
           WHERE "id" = :loanId AND "userId" = :userId`,
          { replacements: { loanId, userId }, type: sequelize.QueryTypes.UPDATE }
        );
        console.log("✅ Due date updated successfully.");
      }

      // ✅ If previous EMI was unpaid, mark late payment
      if (!previousEmiPaid) {
        console.log(`⚠️ Late payment detected for EMI ${previousEmiNo}, adding fine for next EMI.`);
      }
    }

    res.status(200).send("Webhook processed successfully.");
  } catch (error) {
    console.error("Webhook Error:", error);
    res.status(400).send(`Webhook error: ${error.message}`);
  }
};


const getOverdueEmis = async () => {
  try {
    const results = await sequelize.query(
      `SELECT t.user_id, t.loan_id, t.emi_no, l.dueDate, t.amount AS emiAmount, 
              u.email AS userEmail, u.name AS userName, l.totalEmis
       FROM transactions t
       JOIN Loans l ON t.loan_id = l.id
       JOIN Users u ON t.user_id = u.id
       WHERE t.status = 'pending' AND l.dueDate < NOW()`,
      { type: sequelize.QueryTypes.SELECT }
    );

    return results;
  } catch (error) {
    console.error("❌ Error fetching overdue EMIs:", error);
    return [];
  }
};
  

  const getFineAmount = (dueDate, paymentDate) => {
    const due = new Date(dueDate);
    const payment = new Date(paymentDate);
  
    return payment > due ? 200 : 0; // $200 fine if payment is after due date
  };


  const sendAdminAlert = async (userId, loanId, emiNo) => {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASSWORD },
      });
  
      const mailOptions = {
        from: process.env.SMTP_USER,
        to: "admin25@yopmail.com", // Send to Admin
        subject: `🚨 Overdue EMI Alert: Loan #${loanId} - EMI #${emiNo}`,
        html: `<p>User <strong>${userId}</strong> has not paid EMI <strong>#${emiNo}</strong> for Loan <strong>#${loanId}</strong>.</p>
               <p>Immediate action is required.</p>`,
      };
  
      await transporter.sendMail(mailOptions);
      console.log(`📧 Admin alerted about overdue EMI #${emiNo} for Loan #${loanId}`);
    } catch (error) {
      console.error("❌ Error sending admin alert:", error);
    }
  };
  



// Run every day at 12 AM
cron.schedule("0 0 * * *", async () => {
  console.log("🔍 Checking for overdue EMIs...");

  const overdueEmis = await getOverdueEmis(); // Fetch unpaid EMIs past due date
  if (overdueEmis.length === 0) {
    console.log("✅ No overdue EMIs found.");
    return;
  }

  for (const emi of overdueEmis) {
    const { userId, userEmail, userName, emiNo, loanId, dueDate, emiAmount, totalEmis } = emi;

    // ✅ Alert the Admin
    await sendAdminAlert(userId, loanId, emiNo);

    // ✅ Send Reminder Email with Fine
    await sendDueDateReminderEmail(userEmail, userName, emiAmount, dueDate, loanId, userId, emiNo, totalEmis, true);
  }
});



  // const stripeWebhook = async (req, res) => {
  //   console.log("Received Stripe Webhook");
  
  //   const sig = req.headers["stripe-signature"];
  //   let event;
  
  //   try {
  //     // ✅ Convert req.body to buffer before passing it to Stripe
  //     event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);
  //     console.log("Webhook Event:", event);
  
  //     if (event.type === "checkout.session.completed") {
  //       const session = event.data.object;
  //       const userId = session.metadata.user_id;
  //       const loanId = session.metadata.loan_id;
  //       const amountPaid = session.amount_total / 100;
  //       const stripePaymentId = session.payment_intent;
  
  //       // ✅ Fetch payment intent details to get payment date
  //       const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentId);
  //       const paymentDate = new Date(paymentIntent.created * 1000);  
  
  //       console.log(`✅ Payment received: User ${userId}, Loan ${loanId}, Amount ${amountPaid}`);
  
  //       // ✅ Insert transaction record
  //       await sequelize.query(
  //         "INSERT INTO transactions (user_id, loan_id, stripe_payment_id, amount, payment_date, status) VALUES (:userId, :loanId, :stripePaymentId, :amountPaid, :paymentDate, :status)",
  //         {
  //           replacements: {
  //             userId,
  //             loanId,
  //             stripePaymentId,
  //             amountPaid,
  //             paymentDate,
  //             status: "completed",
  //           },
  //           type: sequelize.QueryTypes.INSERT,
  //         }
  //       );
  
  //       // ✅ Update loan due date (Move to next month)
  //       await sequelize.query(
  //         `UPDATE "Loans" 
  //          SET "dueDate" = "dueDate" + INTERVAL '1 month' 
  //          WHERE "id" = :loanId AND "userId" = :userId`,
  //         {
  //           replacements: { loanId, userId },
  //           type: sequelize.QueryTypes.UPDATE,
  //         }
  //       );
  
  //       console.log("✅ Due date updated successfully.");
  //     }
  
  //     res.status(200).send("Webhook processed successfully.");
  //   } catch (error) {
  //     console.error("Webhook Error:", error);
  //     res.status(400).send(`Webhook error: ${error.message}`);
  //   }
  // };
  
  
// const stripeWebhook = async (req, res) => {
//   console.log("Received Stripe Webhook");

//   const sig = req.headers["stripe-signature"];
//   let event;

//   try {
//     // ✅ Convert req.body to buffer before passing it to Stripe
//     event = stripe.webhooks.constructEvent(req.body, sig, endpointSecret);

//     console.log("Webhook Event:", event);

//     if (event.type === "checkout.session.completed") {
//       const session = event.data.object;
//       const userId = session.metadata.user_id;
//       const loanId = session.metadata.loan_id;
//       // const userId =272;
//       // const loanId = 128;
//       const amountPaid = session.amount_total / 100;
//       const stripePaymentId = session.payment_intent;

//             // ✅ Fetch payment intent details to get payment date
//             const paymentIntent = await stripe.paymentIntents.retrieve(stripePaymentId);

//             // ✅ Convert Stripe timestamp to Date object
//             const paymentDate = new Date(paymentIntent.created * 1000);  

//       console.log(
//         `✅ Payment received: User ${userId}, Loan ${loanId}, Amount ${amountPaid}`
//       );

//       await sequelize.query(
//         "INSERT INTO transactions (user_id, loan_id, stripe_payment_id, amount,payment_date, status) VALUES (:userId, :loanId, :stripePaymentId, :amountPaid, :paymentDate,:status)",
//         {
//           replacements: {
//             userId,
//             loanId,
//             stripePaymentId,
//             amountPaid,
//             paymentDate,
//             status: "completed",
//           },
//           type: sequelize.QueryTypes.INSERT,
//         }
//       );

//       // ✅ Update loan status
//       await sequelize.query(
//        'UPDATE "Loans" SET "dueDate" = "dueDate" + INTERVAL \'1 month\' WHERE "id" = :loanId AND "userId" = :userId',
//         {
//           replacements: {
//             status: "active",
//             loanId,
//             userId,
//           },
//           type: sequelize.QueryTypes.UPDATE,
//         }
//       );
//     }
//     res.status(200).send("Webhook processed successfully.");
//   } catch (error) {
//     console.error("Webhook Error:", error);
//     res.status(400).send(`Webhook error: ${error.message}`);
//   }
// };

// ✅ Get Transactions by User ID and Loan ID
const getTransactionsByUserAndLoan = async (req = null, res = null, userId = null, loanId = null) => {
  try {
      // ✅ If called via API, extract from `req.query`
      if (req) {
          userId = req.query.user_id;
          loanId = req.query.loan_id;
      }

      console.log("userId999:", userId, typeof userId);
      console.log("loanId999:", loanId, typeof loanId);

      // ✅ Validate Inputs
      if (!userId || !loanId) {
          if (res) return res.status(400).json({ error: "user_id and loan_id are required" });
          return []; // Return empty array for internal calls
      }

      // ✅ Convert user_id & loan_id to String to match DB types
      userId = String(userId);
      loanId = Number(loanId);

      // ✅ Fetch transactions from database
      const transactions = await sequelize.query(
          `SELECT * FROM transactions WHERE user_id = CAST(:userId AS VARCHAR) AND loan_id = CAST(:loanId AS INTEGER)`,

          {
              replacements: { userId, loanId },
              type: sequelize.QueryTypes.SELECT,
          }
      );

      // console.log("transactions------------", transactions);

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
        AND emi_no = CAST(:emiNo AS INTEGER) 
        LIMIT 1
      `;

      console.log(`🟢 Running SQL Query: ${sqlQuery}`);
      console.log(`🟢 With Parameters:`, { 
        userId: String(userId).trim(), 
        loanId: Number(loanId), 
        emiNo: Number(emiNo) // Ensure emiNo is an integer
      });

      const transaction = await sequelize.query(sqlQuery, {
        replacements: { 
          userId: String(userId).trim(), 
          loanId: Number(loanId), 
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


