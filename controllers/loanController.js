const messages = require("../constants/Messages");
const Loan = require("../models/Loan");
const User = require("../models/User");
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
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
  transactionId,
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
      <h1>Congratulations!</h1>
      <p>Your loan: ${loanId} has been approved by <strong>${adminName}</strong>.</p>
      <ul>
        <li><strong>Approval Date:</strong> ${approvalDate}</li>
        <li><strong>Transaction ID:</strong> ${transactionId}</li>
        <li><strong>Loan Amount:</strong> $${loanAmountNo.toFixed(2)}</li>
        <li><strong>Interest Amount:</strong> $${interestAmount.toFixed(2)}</li>
        <li><strong>Total Payable Amount:</strong> $${totalPayableAmount.toFixed(
          2
        )}</li>
      </ul>
      <p>Thank you for choosing our services!</p>
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

    // ✅ Check if the EMI is already paid
    const isPaid = await getTransactionByEmi(userId, loanId, emiNo);
    console.log(`🔍 EMI ${emiNo} Paid Status:`, isPaid);

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

    //Prepare Email Content
    let subject = `Loan EMI #${emiNo} Due Date Reminder – Loan #${loanId}`;
    let emailHeader;
    if (daysLeft <= 0) {
      emailHeader = `<h2>EMI Payment Due Today. Loan #${loanId} </h2>`;
    } else {
      emailHeader = `<h2>EMI Payment Reminder– Loan #${loanId} </h2>`;
    }

    let message = `<p>Dear ${userName},</p>`;

    if (daysLeft <= 0) {
      message += `<p>This is a friendly reminder that your EMI payment for your loan is due Today.</p>`;
    } else {
      message += `<p>This is a friendly reminder that your EMI payment for your loan is due soon.</p>`;
    }
    message = `
    
    <p>🔹 <strong>Loan ID:</strong> #${loanId}</p>
    <p>🔹 <strong>Total Loan Amount (including interest):</strong> $${totalAmount}</p>
    <p>🔹 <strong>EMI ${emiNo} of ${totalEmis} Amount:</strong> $${emiAmount}</p>
    <p>🔹 <strong>Due Date:</strong> ${dueDate}</p>`;

    if (!isPaid) {
      message += `<p><a href="${paymentUrl}" target="_blank">Click here to pay your EMI</a></p>
      `;
    } else {
      message += `<p><strong>You have already completed the payment successfully.</strong></p>
      <p>No further action is required.</p>`;
    }

    if (daysLeft <= 0) {
      subject = `Loan EMI #${emiNo} Payment Due Today – Loan #${loanId}`;
      if (!isPaid) {
        message += `
      <p><strong>Your EMI payment is due today! Please make the payment as soon as possible to avoid penalties.</strong></p>
      <p><strong>Important:</strong> If the payment is not made by the due date, i.e., <strong>${dueDate}</strong>, a late fee of <strong>$50</strong> will be applied to your loan.</p>
      `;
      }
      console.log(`Checking if fine email is needed for EMI #${emiNo}`);

      // ✅ Check if payment exists after 30 min
      setTimeout(async () => {
        console.log(`🔍 Checking payment status for EMI #${emiNo} after 1 min`);

        // ✅ Fetch transaction status
        const transactions = await getTransactionsByUserAndLoan(
          null,
          null,
          userId,
          loanId,
          emiNo
        );

        if (transactions?.length === 0) {
          console.log(`⚠️ EMI #${emiNo} is still unpaid. Sending fine email.`);

          const userInfo = await sequelize.query(
            `SELECT "email" FROM "Users" WHERE "id" = :userId`,
            { replacements: { userId }, type: sequelize.QueryTypes.SELECT }
          );

          // Extract the amount
          if (!userInfo || userInfo?.length === 0) {
            console.error(`❌ Error: No email found for User ID ${userId}`);
            return;
          }

          const userEmail = userInfo[0]?.email;
          console.log("emiAmount", emiAmount);

          // ✅ Send fine email with correct user email
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
          // ✅ Send Admin Alert
          await sendAdminAlert(
            userId,
            loanId,
            emiNo,
            emiAmount,
            dueDate,
            adminEmail
          );
          console.log("check--1");

          setTimeout(async () => {
            console.log(" email sent to admin after 30 min ");

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
          console.log(`✅ EMI #${emiNo} is now paid. No fine email needed.`);
        }
      }, 2 * 60 * 1000); // ✅ Runs after 3 minute
    }

    message += `<p>Thank you for choosing Cashfluence. Feel free to contact our support team if you need any assistance!</p>
    Best regards<br/>
    Cashfluence Team`;

    // ✅ Send Email
    const mailOptions = {
      from: process.env.SMTP_USER,
      to: userEmail,
      subject: subject,
      html: `${emailHeader}${message}`,
    };

    console.log(
      `📧 Email sent to ${userEmail} for EMI #${emiNo} of ${totalEmis}`
    );
    return transporter.sendMail(mailOptions);
  } catch (error) {
    console.error("❌ Error sending email:", error);
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
      repaymentTerm,
      account,
      interest,
      loanrequested,
      riskLevel,
      riskScore,
      fromAccount, // fromAccount as a whole object

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
      transactionId,
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

    // ✅ First: If approved, set the first due date (1 month after approval)
    if (status === "Approved") {
      let firstDueDate = new Date(approvalDate);
      firstDueDate.setMonth(firstDueDate.getMonth() + 1); // Set due date one month after approval

      loan.approvalDate = approvalDate;
      loan.dueDate = firstDueDate; // Save due date in DB
    }

    try {
      // ✅ Send email notifications only if DB update is successful
      if (status === "Approved") {
        await sendLoanApprovalEmail(
          status,
          adminName,
          adminEmail,
          userEmail,
          transactionId,
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
      // ✅ Update loan status
      loan.status = status;
      await loan.save();

      res.status(200).json({
        success: true,
        message: "Loan status updated successfully.",
        loan,
      });
    } catch (emailError) {
      console.error("⚠ Email sending failed:", emailError);
      return res.status(500).json({
        success: false,
        message: "Loan status updated, but failed to send notification email.",
        error: emailError.message,
      });
    }
  } catch (error) {
    console.error("⚠ Error updating loan status:", error);
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
        'id', 'amount', 'interest', 'repaymentTerm', 'status', 'loanrequested', 
        'riskLevel', 'riskScore', 'dueDate', 'overdueStatus', 'isLoanComplete',  
        'submitTime', 'duration', 'createdAt'
      ],
      order: [['createdAt', 'DESC']], // Latest loans first
    });

    // Check if loans exist
    if (!loans.length) {
      return res.status(404).json({ success: false, message: 'No loans found for this user' });
    }

    // Mask bank account details for security
    const sanitizedLoans = loans.map(loan => ({
      loanId: loan.id,
      amount: loan.amount,
      interest: loan.interest,
      repaymentTerm: loan.repaymentTerm,
      status: loan.status,
      loanRequested: loan.loanrequested,
      riskLevel: loan.riskLevel,
      riskScore: loan.riskScore,
      dueDate: loan.dueDate,
      overdueStatus: loan.overdueStatus,
      isLoanComplete: loan.isLoanComplete,
      // fromAccount: loan.fromAccount ? maskAccount(loan.fromAccount) : null,
      // toAccount: loan.toAccount ? maskAccount(loan.toAccount) : null,
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

const maskAccount = (account) => {
  if (!account || !account.accountNumber) return account;
  return {
    ...account,
    accountNumber: `****${account.accountNumber.slice(-4)}`, // Show only last 4 digits
  };
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
  loanDuration,getAllLoanOfSpecificUser
};
