const nodemailer = require("nodemailer");
const stripe = require("stripe")(
    "sk_test_51QsM5MKGv97rduY5XuQLF5I6RTF6Xo3QPIPybmpJMbJXE1JFrehd21joSRpNtJVESgQ6vFqdWwCFyoIcG4PGJjU500xNty4f3i"
  );
// ✅ Email Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

// ✅ Send Fine Email
const sendFineEmail = async (userName,userEmail, userId, loanId, emiNo, emiAmount) => {
    try {
        const fineAmount = 50;
        const totalAmount = parseInt(emiAmount) + parseInt(fineAmount);

        const totalAmountCents = Math.round(totalAmount * 100);

        console.log(`💰 Fine applied: $${fineAmount} | Total Payable: $${totalAmount}`);

        // ✅ Create Stripe Payment Link (valid for 1 min)
        const session = await stripe.checkout.sessions.create({
            payment_method_types: ["card"],
            line_items: [{
                price_data: {
                    currency: "usd",
                    product_data: { name: `Loan EMI Payment - EMI #${emiNo}` },
                    unit_amount: totalAmountCents,
                },
                quantity: 1,
            }],
            mode: "payment",
            payment_intent_data: { capture_method: "automatic" },
            success_url: `http://localhost:3000/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `http://localhost:3000/payment/cancel?session_id={CHECKOUT_SESSION_ID}&user_id=${userId}&loan_id=${loanId}&emi_amount=${emiAmount}`,
            metadata: { user_id: userId, loan_id: loanId, emi_no: emiNo },
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // ✅ 30-Minute Expiry 

        });

        const paymentUrl = session.url;

        // ✅ Ensure userEmail is not empty before sending email
        if (!userEmail) {
            console.error(`❌ Error: No email provided for EMI #${emiNo}`);
            return;
        }

        // ✅ Send Email with Fine Details
        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_HOST,
            port: process.env.SMTP_PORT,
            secure: false,
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD,
            },
        });

        const subject = `🚨 Fine Applied: EMI #${emiNo} Overdue Payment`;
        const message = `<p>Dear ${userName}</p>
                         <p>Your EMI <strong>#${emiNo}</strong> for Loan <strong>#${loanId}</strong> was due.</p>
                         <p><strong>EMI Amount:</strong> $${emiAmount}</p>
                         <p><strong>Late Fee Applied:</strong> $${fineAmount}</p>
                         <p><strong>Total Payable Amount:</strong> $${totalAmount}</p>
                         <p><a href="${paymentUrl}" target="_blank">Click here to pay now</a></p>
                         <p><strong>⚠️ This payment link is valid for 30 minute.</strong></p>`;

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: userEmail, 
            subject: subject,
            html: message,
        };

        await transporter.sendMail(mailOptions);
        console.log(`📧 Fine email sent for EMI #${emiNo} - Loan #${loanId}`);
    } catch (error) {
        console.error("❌ Error sending fine email:", error);
    }
};


// ✅ Send Admin Alert for Overdue EMI
const sendAdminAlert = async (userId, loanId, emiNo, emiAmount, dueDate,adminEmail) => {
  try {
    const subject = `🚨 Urgent: Overdue EMI Alert - Loan #${loanId} (EMI #${emiNo})`;
    
    const message = `
      <h2>🚨 Overdue EMI Alert</h2>
      <p><strong>User ID:</strong> ${userId}</p>
      <p><strong>Loan ID:</strong> #${loanId}</p>
      <p><strong>EMI Number:</strong> #${emiNo}</p>
      <p><strong>EMI Amount:</strong> $${emiAmount}</p>
      <p><strong>Due Date:</strong> ${dueDate}</p>
      <p style="color: red;"><strong>⚠️ Immediate action is required! The EMI payment has not been received.</strong></p>
      <p>Please take the necessary steps to follow up with the user.</p>
    `;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: adminEmail, 
      subject: subject,
      html: message,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Admin alert sent: EMI #${emiNo} - Loan #${loanId} (User ID: ${userId})`);
  } catch (error) {
    console.error("❌ Error sending admin alert:", error);
  }
};

const sendFineAdminAlert = async (userId, loanId, emiNo, emiAmount, dueDate,adminEmail) => {
  try {
    const fineAmount = 50;
    const totalDue = emiAmount + fineAmount; 

    const subject = `🚨 Urgent: Overdue EMI & Fine Alert - Loan #${loanId} (EMI #${emiNo})`;
    
    const message = `
      <h2>🚨 Overdue EMI & Fine Alert</h2>
      <p><strong>User ID:</strong> ${userId}</p>
      <p><strong>Loan ID:</strong> #${loanId}</p>
      <p><strong>EMI Number:</strong> #${emiNo}</p>
      <p><strong>Original EMI Amount:</strong> $${emiAmount}</p>
      <p><strong>Late Payment Fine:</strong> $${fineAmount}</p>
      <p><strong>Total Due Amount:</strong> <span style="color: red;"><strong>$${totalDue}</strong></span></p>
      <p><strong>Due Date:</strong> ${dueDate}</p>
      <hr>
      <p style="color: red;"><strong>⚠️ Urgent Action Required:</strong></p>
      <p>We have already sent the EMI payment link and the fine payment link to the user. However, the payment has still not been received.</p>
      <p><strong>Immediate follow-up is needed.</strong> Please take the necessary steps to resolve this overdue payment.</p>
    `;

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: adminEmail, 
      subject: subject,
      html: message,
    };

    await transporter.sendMail(mailOptions);
    console.log(`📧 Admin alert sent: Overdue EMI & Fine - EMI #${emiNo}, Loan #${loanId}, User ID: ${userId}`);
  } catch (error) {
    console.error("❌ Error sending admin alert:", error);
  }
};

module.exports = { sendFineEmail, sendAdminAlert,sendFineAdminAlert };
