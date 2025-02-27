// Define a maximum possible risk score for normalization (increased for balance)
const MAX_RISK_SCORE = 500; // Adjust this based on expected maximum raw scores

const calculateRiskScore = (data ) => {
  let riskScore = 0;
  // Credit
  // Overdue
  // APR
  // Next Payment Due Date
  
  // Credit risk factors
  if (data.credit) {
    data.credit.forEach((account) => {
      // Base penalty for overdue accounts
      if (account.is_overdue) riskScore += 15;
  
      // Calculate risk for multiple APR types
      const aprRiskContribution = account.aprs.reduce((sum, apr) => {
        return sum + (apr.balance_subject_to_apr * apr.apr_percentage) / 1000;
      }, 0);
      
      riskScore += aprRiskContribution;
  
      // Penalty for past due payment date
      if (new Date(account.next_payment_due_date) < new Date()) {
        riskScore += 10;
      }
    });
  }
  

  // Student loan risk factors


  // Student Loan
  // Overdue Loans
  // Outstanding Interest
  // PSLF Status 
 
  if (data.student) {
    data.student.forEach((loan) => {
      if (loan.is_overdue) riskScore += 20; // Reduced overdue penalty
      riskScore += loan.outstanding_interest_amount / 1000; // Normalize interest to risk
      if (loan.pslf_status && loan.pslf_status.payments_remaining > 100) {
        riskScore += 10; // Reduced risk for many payments remaining
      }
    });
  }

  // Mortgage risk factors

  // Mortgage
  // Past Due Amount
  // Late Fee
  // PMI (Private Mortgage Insurance)
  if (data.mortgage) {
    data.mortgage.forEach((mortgage) => {
      if (mortgage.past_due_amount > 0) riskScore += 25; // past due
      if (mortgage.current_late_fee > 0) riskScore += 5; // Add for late fees
      if (mortgage.has_pmi) riskScore += 3; // Small penalty for PMI
    });
  }

  // Depository (checking) account risk factors

  // Depository Accounts
  // Low Balance
 
  if (data.accounts) {
    data.accounts.forEach((account) => {
      if (account.balances.available < 500) {
        riskScore += 5; // Reduced penalty for low balance
      }
    });
  }

  // Normalize the score to a 1-10 scale
  const normalizedScore = Math.min(
    Math.max((riskScore / MAX_RISK_SCORE) * 10, 1),
    10
  );

  return normalizedScore;
};

// Service function to get the risk score
const getRiskScore = (data) => {
  const riskScore = calculateRiskScore(data).toFixed(2);

  // Determine risk level based on normalized score
  const riskLevel =
    riskScore > 7 ? "High" : riskScore > 4 ? "Medium" : "Low";

  return {
    riskScore,
    riskLevel,
    message: "Risk score calculated successfully",
  };
};

module.exports = { getRiskScore };
