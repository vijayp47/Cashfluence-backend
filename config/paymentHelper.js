const { sequelize } = require("../config/db");

// ✅ Mark Fine Email as Sent When Payment is Done
const markFineEmailSent = async (userId, loanId, emiNo) => {
  try {
    await sequelize.query(
      `UPDATE transactions 
       SET fine_email_sent = TRUE 
       WHERE user_id = CAST(:userId AS TEXT) 
       AND loan_id = CAST(:loanId AS TEXT) 
       AND emi_no = CAST(:emiNo AS INTEGER) 
       AND status = 'completed'`, // ✅ Only mark TRUE if payment is completed
      {
        replacements: { userId: String(userId), loanId: String(loanId), emiNo: Number(emiNo) },
        type: sequelize.QueryTypes.UPDATE
      }
    );
    console.log(`✅ Fine email marked as sent for EMI #${emiNo} - Loan #${loanId}`);
  } catch (error) {
    console.error("❌ Error marking fine email as sent:", error);
  }
};

// ✅ Check if Fine Email was Already Sent
const checkFineEmailStatus = async (userId, loanId, emiNo) => {
  try {
    const result = await sequelize.query(
      `SELECT fine_email_sent FROM transactions 
       WHERE user_id = CAST(:userId AS TEXT) 
       AND loan_id = CAST(:loanId AS TEXT) 
       AND emi_no = CAST(:emiNo AS INTEGER)`,
      {
        replacements: { userId: String(userId), loanId: String(loanId), emiNo: Number(emiNo) },
        type: sequelize.QueryTypes.SELECT,
      }
    );
    return result.length > 0 && result[0].fine_email_sent;
  } catch (error) {
    console.error("❌ Error checking fine email status:", error);
    return false;
  }
};

module.exports = { markFineEmailSent, checkFineEmailStatus };
