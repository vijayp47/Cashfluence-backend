require("dotenv").config();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.createPaymentIntent = async (req, res) => {
    try {
        const { amount, currency } = req.body;

        if (!amount || !currency) {
            return res.status(400).json({ error: "Missing amount or currency" });
        }

        // Stripe expects amount in Cents
        const amountInCents = Math.round(amount * 100);

        const paymentIntent = await stripe.paymentIntents.create({
            amount: amountInCents,  
            currency,
            payment_method_types: ["card"],
        });

        console.log("Payment Intent Created:", paymentIntent.id);

        res.json({ clientSecret: paymentIntent.client_secret });
    } catch (error) {
        console.error("🚨 Error Creating Payment Intent:", error.message);
        res.status(500).json({ error: error.message });
    }
};

exports.retryPayment = async (req, res) => {
    let { session_id, loan_id, emi_amount, user_id } = req.query;
    console.log("emi_amount", emi_amount);
  
    if (!session_id || !loan_id || !user_id) {
      return res.status(400).json({ error: "Missing session_id, loan_id, or user_id" });
    }
  
    try {
      console.log("Retrieving Stripe session:", session_id);
  
      const session = await stripe.checkout.sessions.retrieve(session_id);
  
      if (session && session.payment_status === "unpaid") {
        console.log("Redirecting to existing session:", session.url);
        return res.redirect(session.url);
      }
  
      
  
      const emiAmountCents = emi_amount ? parseFloat(emi_amount) * 100 : 5000;
      console.log("Final EMI Amount (cents):", emiAmountCents);
  
      const newSession = await stripe.checkout.sessions.create({
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
        success_url: `${process.env.BASE_URL}/payment/success?loan_id=${loan_id}`,
        cancel_url: `${process.env.BASE_URL}/payment/cancel?loan_id=${loan_id}&emiAmount=${emi_amount}`,
        metadata: { loan_id, user_id },
      });
      console.log("*New session created:", newSession.url);
  
      //  Insert the transaction as "pending"
      await sequelize.query(
        `INSERT INTO transactions (user_id, loan_id, stripe_payment_id, amount, status) 
         VALUES (:userId, :loanId, :stripePaymentId, :amountPaid, :status)
         ON CONFLICT (stripe_payment_id) DO NOTHING`,  // Prevents duplicate entry
        {
          replacements: {
            userId: user_id,
            loanId: loan_id,
            stripePaymentId: newSession.id,
            amountPaid: emi_amount,
            status: "complete", 
          },
          type: sequelize.QueryTypes.INSERT,
        }
      );
  
      return res.redirect(newSession.url);
    } catch (error) {
      console.error("Error in retry-payment:", error);
      res.status(500).json({ error: error.message });
    }
  };
  