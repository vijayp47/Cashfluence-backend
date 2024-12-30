// controllers/loanController.js
const messages = require('../constants/Messages');
const Loan = require('../models/Loan');
const User = require('../models/User'); // Include User model if needed
const dotenv = require("dotenv");
const nodemailer = require("nodemailer");
const fs = require('fs'); 
// Initialize environment variables from the .env file
dotenv.config();
const sendLoanApprovalEmail = (status,adminName ,userEmail,transactionId,userName,loanAmount,approvalDate,loanId) => {

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
    subject = "Loan Approval Confirmation";
    htmlContent = `
      <h1>Congratulations!</h1>
      <p>Your loan: ${loanId} has been approved by <strong>${adminName}</strong>.</p>
      <ul>
        <li><strong>Approval Date:</strong> ${approvalDate}</li>
        <li><strong>Transaction ID:</strong> ${transactionId}</li>
        <li><strong>Loan Amount:</strong> ${loanAmount}</li>
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

const sendLoanRejectEmail = (status,userEmail,loanId) => {

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
      toAccount,   // toAccount as a whole object
    } = req.body;

    // Create a loan application linked to the authenticated user
    const loanApplication = await Loan.create({
      amount,
      repaymentTerm,
      userId: req?.user?.userId,
      account,
      interest,
      status: 'Pending', // Default status for new loan applications
      loanrequested,
      riskLevel,
      riskScore,

      // Storing fromAccount and toAccount as entire objects
      fromAccount,  // Storing the entire fromAccount object
      toAccount,    // Storing the entire toAccount object
    });

    // Send response with the loan application details
    res.status(201).json({ success: true, loanApplication });
  } catch (error) {
    res.status(500).json({ success: false, message: "There was an error processing the loan application", error: error.message });
  }
};


// Controller to fetch all loan applications (Admin only)
const getAllLoans = async (req, res) => {
    try {
      const loans = await Loan.findAll({
        include: [
          {
            model: User,
            as: 'user', // Alias must match the association in Loan model
            attributes: ['firstName', 'lastName', 'email'], // Specify only the necessary fields
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
  

  const checkPendingPayments = async (req, res) => {
    try {
      const { loanId } = req.params; // Get loanId from request params
  
      // Mock loan data (replace with a database fetch in production)
      const loanData = {
        id: 12345,
        userId: req?.user?.userId, // Assuming userId comes from an authenticated user
        amount: 1200,
        status: "Pending",
        interestRate: 5.5,
        loanDate: "2024-01-15",
        approvedDate: "2024-01-20",
        dueDate: "2025-01-15",
        amountPending: 400,
        repaymentHistory: [
          { date: "2024-02-15", amountPaid: 200, emiDate: "2024-02-15", status: "Paid" },
          { date: "2024-03-15", amountPaid: 200, emiDate: "2024-03-15", status: "Paid" },
          { date: "2024-04-15", amountPaid: 200, emiDate: "2024-04-15", status: "Paid" },
          { date: "2024-05-15", amountPaid: 200, emiDate: "2024-05-15", status: "Pending" },
          { date: "2024-06-15", amountPaid: 200, emiDate: "2024-06-15", status: "Pending" },
        ],
      };
  
      // Check if any repayment status is pending
      const paymentPending = loanData.repaymentHistory.some(
        (repayment) => repayment.status === "Pending"
      );
  
      // Respond with userId and paymentPending status
      return res.status(200).json({
        success: true,
        userId: loanData.userId,
        paymentPending,
      });
    } catch (error) {
      console.error("Error checking pending payments:", error);
      return res.status(500).json({
        success: false,
        message: "Failed to check pending payments",
        error: error.message,
      });
    }
  };
  

  

// Controller to update the status of a loan application (Admin only)
const updateLoanStatus = async (req, res) => {

    try {
      const { id } = req.params; // Loan ID from URL params
   
      const { status,adminName ,userEmail,transactionId,userName,loanAmount,approvalDate,loanId } = req.body; // Status can be "Approved" or "Rejected"
 if (!status || !['Approved', 'Rejected'].includes(status)) {
        return res.status(400).json({ success: false, message: messages?.INVALID_STATUS});
      }
  
      // Find the loan by ID
      const loan = await Loan.findByPk(id);
      if (!loan) {
        return res.status(404).json({ success: false, message:messages?.LOAN_NOT_FOUND });
      }
  
      if (status == "Approved") {
        await sendLoanApprovalEmail(status,adminName ,userEmail,transactionId,userName,loanAmount,approvalDate,loanId);
      }
    
      if (status == "Rejected") {
        await sendLoanRejectEmail(status,userEmail,loanId);
      }

      // Update the loan status
      loan.status = status;
      await loan.save();
  
      res.status(200).json({ success: true, loan });
    } catch (error) {
      console.error(error); // Add detailed error logging to help debug
      res.status(500).json({ success: false, message: messages?.UPDATE_STATUS_FAILED, error: error.message });
    }
  };

  // Controller to get loan details (including status)
const getLoanDetails = async (req, res) => {
    try {
      const { id } = req.params; // Loan ID from URL params
  
      // Find the loan by ID
      const loan = await Loan.findByPk(id);
      if (!loan) {
        return res.status(404).json({ success: false, message: messages?.LOAN_NOT_FOUND });
      }
  
      res.status(200).json({ success: true, loan });
    } catch (error) {
      console.error(error);
      res.status(500).json({ success: false, message: messages?.LOAN_DETAIL_ERROR, error: error.message });
    }
  };

// Export the controller functions
module.exports = {
  applyForLoan,
  getAllLoans,
  updateLoanStatus,getLoanDetails,checkPendingPayments
};
