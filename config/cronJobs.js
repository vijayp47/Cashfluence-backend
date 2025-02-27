const cron = require("node-cron");
const { sendAdminAlert, sendDueDateReminderEmail } = require("../controllers/loanController");
const { getOverdueEmis, getTransactionByEmi, markFineEmailSent } = require("./paymentHelper");

// ✅ Run cron job every day at 12 AM
cron.schedule("0 0 * * *", async () => {
  console.log("🔍 Checking for overdue EMIs...");

  const overdueEmis = await getOverdueEmis(); // Fetch all overdue EMIs

  if (overdueEmis.length === 0) {
    console.log("✅ No overdue EMIs found.");
    return;
  }

  for (const emi of overdueEmis) {
    const { userId, userEmail, userName, emiNo, loanId, dueDate, emiAmount, totalEmis, fineEmailSent } = emi;

    // ✅ Check if the EMI is still unpaid
    const isStillUnpaid = !(await getTransactionByEmi(userId, loanId, emiNo));

    if (isStillUnpaid && !fineEmailSent) {
      console.log(`🚨 EMI #${emiNo} is overdue. Sending fine email.`);

      // ✅ Send Fine Email (valid for 30 min)
      await sendDueDateReminderEmail(userEmail, userName, emiAmount, dueDate, loanId, userId, emiNo, totalEmis, true);

      // ✅ Alert Admin
      await sendAdminAlert(userId, loanId, emiNo, emiAmount, "Fine email sent to user, pending payment.");
      console.log("first check");
      // ✅ Mark Fine Email as Sent
      await markFineEmailSent(userId, loanId, emiNo);
      console.log("before again email sent to admin ");
      // ✅ Schedule 30 min check
      setTimeout(async () => {
        console.log("again email sent to admin ");
        
        const stillUnpaid = !(await getTransactionByEmi(userId, loanId, emiNo));
        if (stillUnpaid) {
          console.log(`⚠️ EMI #${emiNo} fine email still unpaid. Sending another admin alert.`);
          await sendAdminAlert(userId, loanId, emiNo, emiAmount, "Fine email was not paid within 30 minutes.");
        }
      }, 30 * 60 * 1000); // 30-minute delay
    } else {
      console.log(`✅ EMI #${emiNo} for Loan #${loanId} is already paid. Skipping.`);
    }
  }
});
