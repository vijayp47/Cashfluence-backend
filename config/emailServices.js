const nodemailer = require("nodemailer");
require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET);
// Email Transporter
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: process.env.SMTP_PORT,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

//  Send Fine Email
const sendFineEmail = async (userName,userEmail, userId, loanId, emiNo, emiAmount) => {
    try {
        const fineAmount = 50;
        const totalAmount = parseInt(emiAmount) + parseInt(fineAmount);

        const totalAmountCents = Math.round(totalAmount * 100);

        console.log(`Fine applied: $${fineAmount} | Total Payable: $${totalAmount}`);

        // Create Stripe Payment Link (valid for 1 min)
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
            success_url: `${process.env.BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
            cancel_url: `${process.env.BASE_URL}/payment/cancel?session_id={CHECKOUT_SESSION_ID}&user_id=${userId}&loan_id=${loanId}&emi_amount=${emiAmount}`,
            metadata: { user_id: userId, loan_id: loanId, emi_no: emiNo },
            expires_at: Math.floor(Date.now() / 1000) + (30 * 60), // 30-Minute Expiry 

        });

        const paymentUrl = session.url;

        // Ensure userEmail is not empty before sending email
        if (!userEmail) {
            console.error(`Error: No email provided for EMI #${emiNo}`);
            return;
        }

        // Send Email with Fine Details
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
        const message = `<p><strong>⚠️ Heads Up, ${userName}!</strong></p>
<p>Looks like your last payment came in late, so a small penalty was applied. We totally get it—life happens! Let’s get back on track and keep you moving toward your influencer goals without a hitch. Reach out if you need help sorting this out; we're always here for you.</p>

<p><strong>EMI Amount:</strong> $${emiAmount}</p>
<p><strong>Late Fee Applied:</strong> $${fineAmount}</p>
<p><strong>Total Payable Amount:</strong> $${totalAmount}</p>

<p><a href="${paymentUrl}" target="_blank">Click here to pay now</a></p>
<p><strong>⚠️ This payment link is valid for 30 minutes.</strong></p>




<footer style="margin-top: 35px; font-size: 12px; color: #999;">
  <p style="font-size: 15px; color: #555;">Supporting your success,</p>
  <p style="font-size: 15px; font-weight: bold; color: #333; margin-top: -10px; margin-bottom: 0;">The CashFluence Team 💚</p>
</footer>
`;

        const mailOptions = {
            from: process.env.SMTP_USER,
            to: userEmail, 
            subject: subject,
            html: message,
        };

        await transporter.sendMail(mailOptions);
        console.log(`Fine email sent for EMI #${emiNo} - Loan #${loanId}`);
    } catch (error) {
        console.error("Error sending fine email:", error);
    }
};


// Send Admin Alert for Overdue EMI
const sendAdminAlert = async (userName,userId, loanId, emiNo, emiAmount, dueDate,adminEmail) => {
  try {
    const subject = ` *Action Needed: Overdue EMI Alert for ${userName}* `;
    
    const message = `
  <h2> Overdue EMI Alert</h2>
  <p>Just a quick admin heads-up: <strong>${userName}</strong> has an overdue EMI payment.<br/>
   Let’s kindly follow up to help them get caught up and back on track toward their influencer dreams.</p>

  <ul style="list-style-type: none; padding: 0;">
    <li><strong>User ID:</strong> ${userId}</li>
    <li><strong>Loan ID:</strong> #${loanId}</li>
    <li><strong>EMI Number:</strong> #${emiNo}</li>
    <li><strong>EMI Amount:</strong> $${emiAmount}</li>
    <li><strong>Due Date:</strong> ${dueDate}</li>
  </ul>

  
  <footer style="margin-top: 30px; font-size: 12px; color: #999;">
    <p style="font-size: 15px; color: #555;">Warm regards,</p>
    <p style="font-size: 15px; font-weight: bold; color: #333; margin-top: -10px; margin-bottom: 0;">The CashFluence Team 💚</p>
  </footer>
`;


    const mailOptions = {
      from: process.env.SMTP_USER,
      to: adminEmail, 
      subject: subject,
      html: message,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Admin alert sent: EMI #${emiNo} - Loan #${loanId} (User ID: ${userId})`);
  } catch (error) {
    console.error(" Error sending admin alert:", error);
  }
};

const sendFineAdminAlert = async (userName,userId, loanId, emiNo, emiAmount, dueDate,adminEmail) => {
  try {
    const fineAmount = 50;
    const totalDue = emiAmount + fineAmount; 

    const subject = `*Admin Alert: Pending Penalty Payment from [User Name]*`;

    const message = `
      <h2>Overdue EMI & Fine Alert</h2>
      <p>Just noting that <strong>${userName}</strong> has an unpaid penalty. <br/>
      Let's gently reach out to see if they need any assistance, helping ensure a smooth experience as they continue to grow their influencer journey with us.</p>
      
      <ul style="list-style-type: none; padding: 0;">
        <li><strong>User ID:</strong> ${userId}</li>
        <li><strong>Loan ID:</strong> #${loanId}</li>
        <li><strong>EMI Number:</strong> #${emiNo}</li>
        <li><strong>Original EMI Amount:</strong> $${emiAmount}</li>
        <li><strong>Late Payment Fine:</strong> $${fineAmount}</li>
        <li><strong>Total Due Amount:</strong> <span style="color: red;"><strong>$${totalDue}</strong></span></li>
        <li><strong>Due Date:</strong> ${dueDate}</li>
      </ul>
    
      <hr>
    
    
      <footer style="margin-top: 30px; font-size: 12px; color: #999;">
        <p style="font-size: 15px; color: #555;">Team effort, always,</p>
        <p style="font-size: 15px; font-weight: bold; color: #333; margin-top: -10px; margin-bottom: 0;">The CashFluence Team 💚</p>
      </footer>
    `;
    

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: adminEmail, 
      subject: subject,
      html: message,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Admin alert sent: Overdue EMI & Fine - EMI #${emiNo}, Loan #${loanId}, User ID: ${userId}`);
  } catch (error) {
    console.error(" Error sending admin alert:", error);
  }
};

module.exports = { sendFineEmail, sendAdminAlert,sendFineAdminAlert };
