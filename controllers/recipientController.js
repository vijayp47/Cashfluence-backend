const { createStraddleProcessorToken } = require("../config/plaidConfig");
const PlaidUser = require("../models/PlaidUser");
const {createStraddleCustomer,linkPlaidTokenToStraddle,createStraddlePayout} =require("../config/straddle");

const handleProcessorTokenCreation = async (req, res) => {
  const { account_id,access_token } = req.body;

  if (!access_token || !account_id) {
    return res.status(400).json({ error: 'access_token and account_id are required' });
  }

  try {
    const processorToken = await createStraddleProcessorToken(access_token, account_id);
    return res.status(200).json({ processor_token: processorToken });
  } catch (error) {
    console.log("error--------",error);
    
    res.status(500).json({ error: error.message });
  }
};


const saveProcessToken = async (req, res) => {
  const { process_token, user_id } = req.body;

  if (!process_token) {
    return res.status(400).json({ error: "Missing process_token" });
  }
  if (!user_id) {
    return res.status(401).json({ error: "Unauthorized user" });
  }

  let tokenToSave;
  try {
    if (typeof process_token === 'string') {
      tokenToSave = process_token;
    } else if (
      process_token &&
      typeof process_token === 'object' &&
      'processor_token' in process_token
    ) {
      tokenToSave = process_token.processor_token;
    } else {
      return res.status(400).json({ error: "Invalid process_token format" });
    }

    const [updated] = await PlaidUser.update(
      { plaid_process_token: tokenToSave },
      { where: { user_id } }
    );

    if (updated === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ message: "Process token saved successfully" });

  } catch (err) {
    console.error("Error saving process token:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
};


const approveLoanAndCreateCustomer = async (req, res) => {
  const { name, email, phone, ip_address, plaid_token, amount, description, payment_date, external_id } = req.body;

  try {
    const customer = await createStraddleCustomer({ name, email, phone, ip_address });
    console.log("customer",customer);
    
    const bridge = await linkPlaidTokenToStraddle({ customer_id: customer?.data?.id || customer?.id, plaid_token });
    console.log("bridge",bridge);
    
    const payout = await createStraddlePayout({
      paykey: bridge?.data?.paykey,
      amount,
      description,
      payment_date,
      external_id,
      ip_address
    });
console.log("payout",payout);

    return res.status(200).json({
      message: payout?.data?.status_details?.message,
      data:payout?.data,
      customer_id: customer.id,
      paykey: bridge.paykey,
      payout_id: payout.id
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
};


module.exports = {
  handleProcessorTokenCreation,saveProcessToken,approveLoanAndCreateCustomer
};



