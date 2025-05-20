const messages = require("../constants/Messages");
const Loan = require("../models/Loan");
const User = require("../models/User");
const LoanEligibility = require("../models/LoanEligibilityMatrix");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const { isCompliantState, getAllowedInterest } = require("../services/loanCompliance");

const {
  getTransactionsByUserAndLoan,
  getTransactionByEmi,
} = require("./stripeController");
const schedule = require("node-schedule");
const moment = require("moment");
const {
  sendFineEmail,
  sendAdminAlert,
  sendFineAdminAlert,
} = require("../config/emailServices");

require("dotenv").config();
dotenv.config();
const { sequelize } = require("../config/db");
const stripe = require("stripe")(process.env.STRIPE_SECRET);

// Initialize environment variables from the .env file

const sendLoanApprovalEmail = (
  status,
  adminName,
  adminEmail,
  userEmail,
  // transactionId,
  userName,
  loanAmount,
  approvalDate,
  loanId,
  interestRate
) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Determine email content based on status
  let subject;
  let htmlContent;

  if (status === "Approved") {
    const loanAmountNo = Number(loanAmount); // Ensure it's a number
    const interestRateNo = Number(interestRate);

    const interestAmount = (loanAmountNo * interestRateNo) / 100; // Calculate interest
    const totalPayableAmount = loanAmountNo + interestAmount; // Loan Amount + Interest

    subject = `Loan #${loanId} Approval Confirmation`;
    htmlContent = `
    <h2>🎉 *Awesome news, ${userName}!* 🎉</h2>
    <p>Your loan application has been officially approved, and the funds are on their way! You've taken a powerful step toward your goals—whether it's new gear, exciting collaborations, or growing your influencer reach. We’re excited to see what you accomplish next!</p>
  
    <ul style="list-style-type: none; padding: 0;">
      <li><strong>Approval Date:</strong> ${approvalDate}</li>

      <li><strong>Loan Amount:</strong> $${loanAmountNo.toFixed(2)}</li>
      <li><strong>Interest Amount:</strong> $${interestAmount.toFixed(2)}</li>
      <li><strong>Total Payable Amount:</strong> $${totalPayableAmount.toFixed(2)}</li>
    </ul>
  
   
  
    <footer style="margin-top: 35px; font-size: 12px; color: #999;">
  <p style="font-size: 15px; color: #555;">Stay amazing,</p>
  <p style="font-size: 15px; font-weight: bold; color: #333; margin-top: -10px; margin-bottom: 0;">The CashFluence Team 💚</p>
</footer>

  `;
  
  } else if (status === "Rejected") {
    subject = "Loan Application Rejection";
    htmlContent = `
      <h1>We're Sorry</h1>
      <p>Unfortunately, your loan application has been rejected.</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Thank you for considering our services!</p>
    `;
  } else {
    throw new Error("Invalid status provided. Must be 'approve' or 'reject'.");
  }

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: userEmail,
    subject: subject,
    html: htmlContent,
  };

  return transporter.sendMail(mailOptions);
};

const sendLoanRejectEmail = (status, userEmail, loanId) => {
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  // Determine email content based on status
  let subject;
  let htmlContent;

  subject = "Loan Application Rejection";
  htmlContent = `
      <h1>We're Sorry</h1>
      <p>Unfortunately, your loan: ${loanId} application has been rejected.</p>
      <p>If you have any questions, please contact our support team.</p>
      <p>Thank you for considering our services!</p>
    `;

  const mailOptions = {
    from: process.env.SMTP_USER,
    to: userEmail,
    subject: subject,
    html: htmlContent,
  };

  return transporter.sendMail(mailOptions);
};

const sendDueDateReminderEmail = async (
  userEmail,
  userName,
  totalAmount,
  emiAmount,
  dueDate,
  loanId,
  userId,
  daysLeft,
  emiNo,
  totalEmis,
  adminEmail
) => {
  try {
    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD,
      },
    });
    const emiAmountCents = Math.round(parseFloat(emiAmount) * 100);
    let paymentUrl = "";

    // Check if the EMI is already paid
    const isPaid = await getTransactionByEmi(userId, loanId, emiNo);
    console.log(` EMI ${emiNo} Paid Status:`, isPaid);

    if (!isPaid) {
      const session = await stripe.checkout.sessions.create({
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
        payment_intent_data: { capture_method: "automatic" },
        success_url: `${process.env.BASE_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.BASE_URL}/payment/cancel?session_id={CHECKOUT_SESSION_ID}&user_id=${userId}&loan_id=${loanId}&emi_amount=${emiAmount}`,
        metadata: {
          user_id: userId,
          loan_id: loanId,
          emi_no: emiNo,
          totalEmis: totalEmis,
        },
      });

      paymentUrl = session.url;
    }


  
// Prepare Email Content
let subject = `Loan EMI #${emiNo} Due Date Reminder – Loan #${loanId}`;
let emailHeader;
let message = "";

if (daysLeft <= 0 && !isPaid) {
  emailHeader = `<h3>📅 *Today's the day, ${userName}!*</h3>`;
  message += `<p>Your EMI payment is due today.</p>`;
} else if(daysLeft >= 1){
  emailHeader = `<h3>⏰ *Friendly Reminder, ${userName}!*</h3>`;
  message += `<p>Your EMI payment is coming up soon! Staying ahead of your payments will help you continue to build a strong credit history and keep working toward your influencer goals. You've got this! And if you need any support, we're always here for you.</p>`;
}
else if(isPaid){
  emailHeader = `<h3>✅ *Payment Received—You're Amazing, ${userName}!* ✅</h3>`;
   message += ` <p>Just confirming that we've received your EMI payment. Great job staying ahead and keeping your influencer goals clearly in sight. You're on fire—keep crushing it!</p>
 `
 }

// Adding Loan Information
message += `
  <p style="margin-bottom: -7px;">🔹 <strong>Loan ID:</strong> #${loanId}</p>
  <p style="margin-bottom: -7px;">🔹 <strong>Total Loan Amount (including interest):</strong> $${totalAmount}</p>
  <p style="margin-bottom: -7px;">🔹 <strong>EMI ${emiNo} of ${totalEmis} Amount:</strong> $${emiAmount}</p>
  <p style="margin-bottom: -7px;">🔹 <strong>Due Date:</strong> ${dueDate}</p>`;

if (!isPaid) {
  message += `<p><a href="${paymentUrl}" target="_blank">Click here to pay your EMI</a></p>`;
} else {
  message += `
  <p style="margin-top: 30px;">Proud of your progress,<br/>
  The CashFluence Team 💚</p>`;
}

if (daysLeft <= 0) {
  subject = `Loan EMI #${emiNo} Payment Due Today – Loan #${loanId}`;
  if (!isPaid) {
    message += `
    <p> Paying on time helps you maintain a smooth and stress-free influencer journey. Thanks for staying awesome and organized—let’s keep up the momentum together!</p>
    <p><strong>Important:</strong> If the payment is not made by the due date, i.e., <strong>${dueDate}</strong>, a late fee of <strong>$50</strong> will be applied to your loan.</p>
  <p style="margin-top: 30px;"> Cheering you on,<br/>
  The CashFluence Team 💚</p>`;
  }
  console.log(`Checking if fine email is needed for EMI #${emiNo}`);

  // Check if payment exists after 30 min
  setTimeout(async () => {
    console.log(`Checking payment status for EMI #${emiNo} after 1 min`);

    // Fetch transaction status
    const transactions = await getTransactionsByUserAndLoan(
      null,  // req
      null,  // res
      userId,
      loanId,
      emiNo
    );

    if (transactions?.length === 0) {
      console.log(`EMI #${emiNo} is still unpaid. Sending fine email.`);

      const userInfo = await sequelize.query(
        `SELECT "email" FROM "Users" WHERE "id" = :userId`,
        { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
      );

      // Extract the amount
      if (!userInfo || userInfo?.length === 0) {
        console.error(`Error: No email found for User ID ${userId}`);
        return;
      }

      const userEmail = userInfo[0]?.email;
    

      // Send fine email with correct user email
      await sendFineEmail(
        userName,
        userEmail,
        userId,
        loanId,
        emiNo,
        emiAmount
      );
      await Loan.update(
        { overdueStatus: "Overdue" },
        { where: { id: loanId } }
      );
      // Send Admin Alert
      await sendAdminAlert(
        userName,
        userId,
        loanId,
        emiNo,
        emiAmount,
        dueDate,
        adminEmail
      );
      console.log("check--1");

      setTimeout(async () => {
        console.log("email sent to admin after 30 min ");

        const stillUnpaid = !(await getTransactionByEmi(
          userId,
          loanId,
          emiNo
        ));
        if (stillUnpaid) {
          console.log(
            `⚠️ EMI #${emiNo} fine email still unpaid. Sending another admin alert.`
          );
          await sendFineAdminAlert(
            userName,
            userId,
            loanId,
            emiNo,
            emiAmount,
            dueDate,
            adminEmail,
            "Fine email was not paid within 30 minutes."
          );
        }
      }, 30 * 60 * 1000);
    } else {
      console.log(`EMI #${emiNo} is now paid. No fine email needed.`);
    }
  }, 2 * 60 * 1000); // Runs after 2 minutes

} else {
  message += `<p style="margin-top: 30px;"> Warm wishes,  <br/>
  The CashFluence Team 💚</p>
 `;
}

// Send Email
const mailOptions = {
  from: process.env.SMTP_USER,
  to: userEmail,
  subject: subject,
  html: `${emailHeader}${message}`,
};

console.log(`Email sent to ${userEmail} for EMI #${emiNo} of ${totalEmis}`);
return transporter.sendMail(mailOptions);

  } catch (error) {
    console.error("Error sending email:", error);
  }
};

const scheduleDueDateEmails = (
  userEmail,
  userName,
  loanAmount,
  interestRate,
  approvalDate,
  loanId,
  userId,
  months,
  adminEmail
) => {
  const totalAmount = (loanAmount * (1 + interestRate / 100)).toFixed(2);
  const emiAmount = (totalAmount / months).toFixed(2);

  for (let emiNo = 1; emiNo <= months; emiNo++) {
    const dueDate = moment()
      .add(emiNo * 2, "minutes")
      .format("YYYY-MM-DD HH:mm");
    const reminderTimes = [1, 0]; // Reminders 2 min, 1 min, and at due time

    reminderTimes.forEach((daysBefore) => {
      const scheduleTime = moment(dueDate)
        .subtract(daysBefore, "minutes")
        .toDate();

      schedule.scheduleJob(scheduleTime, function () {
        console.log(
          `⏳ Scheduled reminder for EMI #${emiNo} out of ${months} at ${scheduleTime}`
        );

        sendDueDateReminderEmail(
          userEmail,
          userName,
          totalAmount,
          emiAmount,
          dueDate,
          loanId,
          userId,
          daysBefore,
          emiNo,
          months,
          adminEmail
        );
      });
    });
  }
};

const loanCompletedStatus = async (req, res) => {
  const loanId = req.params.loanId; // Get loanId from URL params
  const { isLoanComplete } = req.body; // Get the isLoanComplete status from request body

  try {
    // Find the loan by its primary key (loanId)
    const loan = await Loan.findByPk(loanId);

    // If loan not found, return an error
    if (!loan) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }

    // Update the loan's isLoanComplete field
    loan.isLoanComplete = isLoanComplete;

    // Save the updated loan
    await loan.save();

    // Send success response
    return res
      .status(200)
      .json({ success: true, message: "Loan status updated successfully" });
  } catch (err) {
    console.error(err);
    return res
      .status(500)
      .json({ success: false, message: "Error updating loan status" });
  }
};

// Controller to handle loan application submission
const applyForLoan = async (req, res) => {
 
  try {
    const {
      amount,
      fee,
      repaymentTerm,
      account,
      interest,
      loanrequested,
      riskLevel,
      riskScore,
      fromAccount, 

      lastLoginAt,
    } = req.body;
    const submitTime = new Date(); // Current time
    let duration = null; // Default null if lastLoginAt is missing

    if (lastLoginAt) {
      const lastLoginTime = new Date(lastLoginAt).getTime();
      if (!isNaN(lastLoginTime)) {
        duration = (submitTime.getTime() - lastLoginTime) / 1000; // Convert to seconds
      }
    }


    // Create a loan application linked to the authenticated user
    const loanApplication = await Loan.create({
      amount,
      fee,
      repaymentTerm,
      userId: req?.user?.userId,
      account,
      interest,
      status: "Pending", // Default status for new loan applications
      loanrequested,
      riskLevel,
      riskScore,

      // Storing fromAccount and toAccount as entire objects
      fromAccount, // Storing the entire fromAccount object
      // toAccount, // Storing the entire toAccount object
      submitTime,
      duration, // Save duration
      
    });

    // Send response with the loan application details
    res.status(201).json({ success: true, loanApplication });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "There was an error processing the loan application",
      error: error.message,
    });
  }
};
const updateLoanStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const {
      status,
      adminName,
      adminEmail,
      userEmail,
      // transactionId,
      userName,
      loanAmount,
      approvalDate,
      loanId,
      interestRate,
      userId,
      months,
    } = req.body;

    if (!status || !["Approved", "Rejected"].includes(status)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid status" });
    }

    const loan = await Loan.findByPk(id);
    if (!loan) {
      return res
        .status(404)
        .json({ success: false, message: "Loan not found" });
    }

    if (loan.status === status) {
      console.log(
        `⚠ Loan ID ${loanId} is already ${status}, skipping duplicate processing.`
      );
      return res
        .status(400)
        .json({ success: false, message: "Loan status already updated" });
    }

    // First: If approved, set the first due date (1 month after approval)
    if (status === "Approved") {
      let firstDueDate = new Date(approvalDate);
      firstDueDate.setMonth(firstDueDate.getMonth() + 1); // Set due date one month after approval

      loan.approvalDate = approvalDate;
      loan.dueDate = firstDueDate; // Save due date in DB
    }

    try {
      // Send email notifications only if DB update is successful
      if (status === "Approved") {
        await sendLoanApprovalEmail(
          status,
          adminName,
          adminEmail,
          userEmail,
          // transactionId,
          userName,
          loanAmount,
          approvalDate,
          loanId,
          interestRate
        );

        await scheduleDueDateEmails(
          userEmail,
          userName,
          loanAmount,
          interestRate,
          approvalDate,
          loanId,
          userId,
          months,
          adminEmail
        );
      } else if (status === "Rejected") {
        await sendLoanRejectEmail(status, userEmail, loanId);
      }
      //  Update loan status
      loan.status = status;
      await loan.save();

      res.status(200).json({
        success: true,
        message: "Loan status updated successfully.",
        loan,
      });
    } catch (emailError) {
      console.error("Email sending failed:", emailError);
      return res.status(500).json({
        success: false,
        message: "Loan status updated, but failed to send notification email.",
        error: emailError.message,
      });
    }
  } catch (error) {
    console.error(" Error updating loan status:", error);
    res.status(500).json({
      success: false,
      message: "Error updating loan status",
      error: error.message,
    });
  }
};

// Controller to fetch all loan applications (Admin only)
const getAllLoans = async (req, res) => {
  try {
    const loans = await Loan.findAll({
      include: [
        {
          model: User,
          as: "user", // Alias must match the association in Loan model
          attributes: ["firstName", "lastName", "email"], // Specify only the necessary fields
        },
      ],
    });
    res.json({ success: true, loans });
  } catch (error) {
    console.error(messages?.FAILED_TO_FETCH_LOAN, error);
    res.status(500).json({
      success: false,
      message: messages?.FAILED_TO_FETCH_LOAN,
      error: error.message,
    });
  }
};

const loanDuration = async (req, res) => {
  try {
    const data = await Loan.findAll({
      attributes: ["userId", "duration", "submitTime"],
      order: [["submitTime", "DESC"]], // Sort by latest applications
    });

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Error fetching loan durations",
      error: error.message,
    });
  }
};



const checkLoanEligibility = async (req, res) => {
  const { state, loan_amount, loan_term, calculated_interest } = req.query;

  try {
    // Convert parameters to appropriate types
    const amount = parseFloat(loan_amount);
    const term = parseInt(loan_term);
    let interest = parseFloat(calculated_interest);
console.log("state",state);

    const loanEligibility = await LoanEligibility.findOne({ where: { state } });

    if (!loanEligibility) {
      return res.status(400).json({ message: "State not found" });
    }

    // Check if loan type is allowed in the state
    const isShortTerm = term <= 31; // Generally short term is <= 31 days

    // --- Short-Term Loan Check ---
    if (isShortTerm) {
      if (!loanEligibility.short_term_allowed) {
        return res.status(400).json({
          message: `Short-term loans are not allowed in ${state}`
        });
      }

      if (loanEligibility.short_term_max_amount && amount > loanEligibility.short_term_max_amount) {
        return res.status(400).json({
          message: `Loan amount exceeds short-term limit of $${loanEligibility.short_term_max_amount} in ${state}`
        });
      }

      if (
        (loanEligibility.short_term_min_term && term < loanEligibility.short_term_min_term) ||
        (loanEligibility.short_term_max_term && term > loanEligibility.short_term_max_term)
      ) {
        return res.status(400).json({
          message: `Loan term must be between ${loanEligibility.short_term_min_term || 'N/A'} and ${loanEligibility.short_term_max_term || 'N/A'} days for short-term loans in ${state}`
        });
      }

      // Handle Florida short-term loans with tiered rates
      if (state === 'Florida') {
        const aprInfo = loanEligibility.max_installment_apr || '';
        if (aprInfo.includes('tiered')) {
          let minAPR = 18, maxAPR = 30; // Default values for Florida's tiered system
          
          // Use the user's requested loan term directly
          // term is already parsed from loan_term in the query params
          const minTerm = 7; // Minimum term for Florida
          const maxTerm = 31; // Maximum term for Florida
          
          if (term <= minTerm) {
            interest = maxAPR;
          } else if (term >= maxTerm) {
            interest = minAPR;
          } else {
            const termRatio = (term - minTerm) / (maxTerm - minTerm);
            interest = maxAPR - termRatio * (maxAPR - minAPR);
          }
        }
      }

      return res.status(200).json({
        eligible: true,
        type: 'short-term',
        adjusted_interest: interest,
        message: `Eligible for short-term loan in ${state}`
      });
    } 
    // --- Installment Loan Check ---
    else {
      if (!loanEligibility.installment_allowed) {
        return res.status(400).json({
          message: `Installment loans are not allowed in ${state}`
        });
      }

      // Parse max_installment_apr from string to numerical values
      let minAPR = null;
      let maxAPR = null;
      let hasAPRCap = true;
      let isTiered = false;

      if (loanEligibility.max_installment_apr) {
        // Handle "No cap" case
        if (loanEligibility.max_installment_apr.toLowerCase().includes('no cap')) {
          hasAPRCap = false;
      }
        // Handle ranges with plus sign like "36%+"
        else if (loanEligibility.max_installment_apr.includes('+') && !loanEligibility.max_installment_apr.includes('fee')) {
          const baseRate = parseFloat(loanEligibility.max_installment_apr.replace('%+', ''));
          minAPR = baseRate;
          maxAPR = null; // No upper limit
        }
        // Handle ranges like "24%–36%" by splitting on dash or hyphen
        else if (loanEligibility.max_installment_apr.includes('tiered')) {
          isTiered = true;
          // For tiered rates, extract the numbers and handle in the switch case
          if (loanEligibility.max_installment_apr.includes('–') || 
              loanEligibility.max_installment_apr.includes('-')) {
            const delimiter = loanEligibility.max_installment_apr.includes('–') ? '–' : '-';
            const tieredParts = loanEligibility.max_installment_apr.split(delimiter);
            minAPR = parseFloat(tieredParts[1].replace('% tiered', '').trim());
            maxAPR = parseFloat(tieredParts[0].replace('%', '').trim());
          } else {
            // Single value tiered like "36% tiered"
            maxAPR = parseFloat(loanEligibility.max_installment_apr.replace('% tiered', ''));
            minAPR = maxAPR; // Default if no range
          }
        }
        // Handle ranges without "tiered"
        else if (loanEligibility.max_installment_apr.includes('–') || 
                loanEligibility.max_installment_apr.includes('-')) {
          const delimiter = loanEligibility.max_installment_apr.includes('–') ? '–' : '-';
          const ranges = loanEligibility.max_installment_apr.split(delimiter);
          minAPR = parseFloat(ranges[0].replace('%', ''));
          maxAPR = parseFloat(ranges[1].replace('%', ''));
        }
        // Handle percentage with additional fees
        else if (loanEligibility.max_installment_apr.includes('+') && loanEligibility.max_installment_apr.includes('fee')) {
          const baseRate = parseFloat(loanEligibility.max_installment_apr.split('+')[0].replace('%', ''));
          maxAPR = baseRate;
          minAPR = baseRate;
        }
        // Handle single values like "36%"
        else {
          const numericPart = loanEligibility.max_installment_apr.replace('%', '');
          if (!isNaN(parseFloat(numericPart))) {
            maxAPR = parseFloat(numericPart);
            minAPR = maxAPR; // For single values, min and max are the same
          }
        }
      }

      // Special state-specific handling
      switch(state) {
        case 'Florida':
          // Florida has tiered rates from 30% to 18% depending on loan term
          if (isTiered && maxAPR && minAPR) {
            const minTerm = loanEligibility.short_term_min_term || 7;
            const maxTerm = loanEligibility.short_term_max_term || 31;
            
            if (term <= minTerm) {
              interest = maxAPR; // 30% for shortest terms
            } else if (term >= maxTerm) {
              interest = minAPR; // 18% for longest terms
            } else {
              const termRatio = (term - minTerm) / (maxTerm - minTerm);
              interest = maxAPR - termRatio * (maxAPR - minAPR);
            }
          }
          break;

        case 'Colorado':
          // Colorado: 36% tiered system
          if (isTiered) {
            // In Colorado, we apply the tiered rate structure
            // This is a simplified implementation - in real system, 
            // you might want more complex tiers based on amount
            if (amount <= 1000) {
              interest = 36; // 36% for amounts up to $1000
            } else if (amount <= 3000) {
              interest = 32; // 32% for $1001-$3000
            } else {
              interest = 28; // 28% for amounts over $3000
            }
          }
          break;

        case 'California':
          // California: 36% on loans <$2,500, no cap above $2,500
          // Fixed the comparison: only apply cap when amount is LESS than 2500
          if (amount < 2500 && interest > 36) {
            interest = 36;
          }
          // For loans >= $2500, do not cap the interest rate
          break;

        case 'North Carolina':
          // 30%/18% split (typically 30% for first $1000, 18% thereafter)
          if (amount <= 1000) {
            interest = Math.min(interest, 30);
          } else {
            // For amounts over $1000, calculate blended rate
            // 30% on first $1000, 18% on remainder
            const firstThousand = 1000 * 0.30;
            const remainder = (amount - 1000) * 0.18;
            const blendedInterest = (firstThousand + remainder) / amount * 100;
            interest = Math.min(interest, Math.round(blendedInterest * 100) / 100);
          }
          break;

        case 'Delaware':
        case 'Missouri':
        case 'Nevada':
        case 'Texas':
        case 'Utah':
        case 'Idaho':
          // States with no cap on interest rates
          hasAPRCap = false;
          break;

        case 'Alaska':
        case 'Tennessee':
          // Range is 24%-36%
          interest = Math.max(24, Math.min(interest, 36));
          break;

        case 'Indiana':
          // Range is 36%-39%
          interest = Math.max(36, Math.min(interest, 39));
          break;

        case 'New York':
          // Extremely strict - 16% civil, 25% criminal
          if (interest > 16) {
            interest = 16;
            // return res.status(400).json({
            //   message: "Loan exceeds New York's 16% civil usury cap"
            // });
          }
          break;

        // case 'Arkansas':
        //   // Constitutional cap of 17%
        //   if (interest > 17) {
        //     return res.status(400).json({
        //       message: "Loan exceeds Arkansas's 17% constitutional cap"
        //     });
        //   }
        //   break;
        case 'Arkansas':
  if (interest > 17) {
    interest = 17; // Cap the interest instead of rejecting
  }
  break;

        case 'Pennsylvania':
          // Hard cap range of 6%-24%
        if (interest < 6) {
  interest = 6;  // Directly set to 6% if interest is less than 6%
} else {
  interest = Math.min(interest, 24);  // Otherwise, cap it at 24%
}
         
          break;

        case 'Massachusetts':
          // 23% + $20 fee
          if (interest > 23) {
            interest = 23;
          }
          break;

        case 'Georgia':
          // 10% + fees
          if (interest > 10) {
            interest = 10;
          }
          break;

        case 'Ohio':
          // 28% + fees
          if (interest > 28) {
            interest = 28;
          }
          break;

        default:
          // Apply minimum APR if one exists and we have a cap
          if (hasAPRCap && minAPR !== null && interest < minAPR) {
            interest = minAPR;
          }
          
          // Apply maximum APR if one exists and interest exceeds it and we have a cap
          if (hasAPRCap && maxAPR !== null && interest > maxAPR) {
            interest = maxAPR;
          }
          
          // Also handle generic max APR cap for small loans
          if (amount <= 2500 && ['Arizona', 'Illinois', 'Minnesota', 'Montana', 'Nebraska', 'New Hampshire', 
                                'New Mexico', 'Oregon', 'South Dakota', 'Virginia', 'Washington', 'Wisconsin',
                                'Wyoming'].includes(state) && interest > 36) {
            interest = 36;
          }
          break;
      }

      // Calculate additional fees based on state
      let additionalFees = 0;
      let feeDescription = '';
      
      // State-specific fee calculations
      switch(state) {
        case 'Oregon':
          additionalFees = 10; // $10 setup fee
          feeDescription = '$10 setup fee';
          break;
        case 'Massachusetts':
          additionalFees = 20; // $20 fee
          feeDescription = '$20 service fee';
          break;
        case 'Virginia':
          additionalFees = 50; // $50 fee
          feeDescription = '$50 processing fee';
          break;
        case 'Ohio':
          // Monthly maintenance fee
          const monthlyFee = 10;
          const months = Math.max(1, Math.ceil(term / 30));
          additionalFees = monthlyFee * months;
          feeDescription = `$${additionalFees} maintenance fee ($10/month)`;
          break;
        case 'Georgia':
          if (amount <= 1000) {
            additionalFees = Math.min(15, amount * 0.10); // 10% up to $15 max
            feeDescription = `$${additionalFees.toFixed(2)} verification fee`;
          }
          break;
      }

      return res.status(200).json({
        eligible: true,
        type: 'installment',
        adjusted_interest: interest,
        has_apr_cap: hasAPRCap,
        additional_fees: additionalFees > 0 ? additionalFees : null,
        fee_description: feeDescription || null,
        message: `Eligible for installment loan in ${state} with${hasAPRCap ? ' adjusted' : ''} APR${additionalFees > 0 ? ` and ${feeDescription}` : ''}`
      });
    }
  } catch (error) {
    console.error("Error checking loan eligibility:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};

const getAllLoanOfSpecificUser = async (req, res) => {
  try {
    const { userId } = req.params;

    // Validate userId
    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required' });
    }

    // Fetch user loans from the database
    const loans = await Loan.findAll({
      where: { userId }, // Assuming userId exists in the Loan model
      attributes: [
        'id', 'amount','fee', 'interest', 'repaymentTerm', 'status', 'loanrequested', 
        'riskLevel', 'riskScore', 'dueDate', 'overdueStatus', 'isLoanComplete',  
        'submitTime', 'duration', 'createdAt'
      ],
      order: [['createdAt', 'DESC']], // Latest loans first
    });

    // Check if loans exist
    if (!loans.length) {
      return res.status(404).json({ success: false, message: 'You don’t have any loans at the moment.' });
    }
console.log("loans",loans);

    // Mask bank account details for security
    const sanitizedLoans = loans.map(loan => ({
      loanId: loan.id,
    
      amount: loan.amount,
        fee :loan.fee,
      interest: loan.interest,
      repaymentTerm: loan.repaymentTerm,
      status: loan.status,
      loanRequested: loan.loanrequested,
      riskLevel: loan.riskLevel,
      riskScore: loan.riskScore,
      dueDate: loan.dueDate,
      overdueStatus: loan.overdueStatus,
      isLoanComplete: loan.isLoanComplete,
      
      submitTime: loan.submitTime,
      duration: loan.duration,
      createdAt: loan.createdAt,
    }));

    return res.status(200).json({ success: true, data: sanitizedLoans });

  } catch (error) {
    console.error('Error fetching loans:', error);
    return res.status(500).json({ success: false, message: 'Internal server error' });
  }
};



// Controller to get loan details (including status)
const getLoanDetails = async (req, res) => {
  try {
    const { id } = req.params; // Loan ID from URL params

    // Find the loan by ID
    const loan = await Loan.findByPk(id);
    if (!loan) {
      return res
        .status(404)
        .json({ success: false, message: messages?.LOAN_NOT_FOUND });
    }

    res.status(200).json({ success: true, loan });
  } catch (error) {
    console.error(error);
    res.status(500).json({
      success: false,
      message: messages?.LOAN_DETAIL_ERROR,
      error: error.message,
    });
  }
};

// Export the controller functions
module.exports = {
  applyForLoan,
  getAllLoans,
  updateLoanStatus,
  getLoanDetails,
  loanCompletedStatus,
  loanDuration,getAllLoanOfSpecificUser,
  
  checkLoanEligibility
};
