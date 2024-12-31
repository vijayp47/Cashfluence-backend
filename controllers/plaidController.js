// Assuming you have already set up and initialized plaidClient like in the previous example
const { plaidClient } = require("../config/plaidConfig");
const User = require('../models/User');
const PlaidUser = require('../models/PlaidUser');
const { Account, Balances, Mortgage, StudentLoan } = require('../models/Plaid'); 
const { sequelize } = require('../config/db');
const riskService = require("../services/riskServices")
const TEMPLATE_ID = process.env.TEMPLATE_ID;
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;
const PLAID_ENV = process.env.PLAID_ENV;
console.log("TEMPLATE_ID",TEMPLATE_ID);


// Function to create link token
const createLinkToken = async (req, res) => {
  try {
    const response = await plaidClient.linkTokenCreate({
      user: {
        client_user_id: "unique_user_id",
      },
      client_name: "Cashfluence",
      products: ["liabilities"], // products as needed
      country_codes: ["US"],
      language: "en",
    });

    const linkToken = response.data.link_token;

    // Return the link token to the client
    res.json({ link_token: linkToken });
  } catch (error) {
    console.error(
      "Error creating link token:",
      error.response?.data || error.message
    );
    res
      .status(500)
      .json({ error: "An error occurred while creating the link token" });
  }
};

const plaidPublicToken = async (req, res) => {
  const { public_token } = req.body;

  try {
    const response = await plaidClient.itemPublicTokenExchange({
      public_token,
    });

    const accessToken = response.data.access_token;
    const itemId = response.data.item_id;

    // Return the access token and item ID to the frontend
    res.json({ accessToken, itemId });
  } catch (error) {
    console.error(
      "Error exchanging public token:",
      error.response?.data || error.message
    );
    res.status(500).json({ error: "An error occurred exchanging the token" });
  }
};

const getLiabilities = async (req, res) => {
  const { accessToken } = req.body;
  const userId = req?.query?.userId; 

  if (!accessToken) {
    return res.status(400).json({ error: "Access token is required" });
  }

  if (!userId) {
    return res.status(400).json({ error: "User not found" });
  }

  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'No token provided' });
  }


  try {
    // Fetch liabilities from Plaid API
    const response = await plaidClient.liabilitiesGet({ access_token: accessToken });

 
    // Start a database transaction to ensure atomicity
    const transaction = await sequelize.transaction();

    try {
      const { accounts, liabilities, item } = response.data;
      const { mortgage, student } = liabilities;
      const institutionName = item?.institution_name;
      const institutionId = item?.institution_id;
       userId;

      // Upsert Account Data
      for (const accountData of accounts) {
     
        await Account.upsert(
          {
            accountId: accountData.account_id,
            accessToken, 
            mask: accountData.mask,
            name: accountData.name,
            officialName: accountData.official_name || null,
            persistentAccountId: accountData.persistent_account_id,
            subtype: accountData.subtype,
            type: accountData.type,
            userId,
            institution_name: institutionName,
            institution_id: institutionId,
          },
          { transaction }
        );

        // Upsert Balances
        if (accountData.balances) {
      
          await Balances.upsert(
            {
              accountId: accountData.account_id,
              available: accountData.balances.available,
              current: accountData.balances.current,
              isoCurrencyCode: accountData.balances.iso_currency_code,
              limit: accountData.balances.limit,
              unofficialCurrencyCode: accountData.balances.unofficial_currency_code,
              userId,
            },
            { transaction }
          );
        }
      }

      // Handle Mortgages
      if (mortgage) {
        for (const mortgageData of mortgage) {
      
          await Mortgage.upsert(
            {
              accountId: mortgageData.account_id,
              accountNumber: mortgageData.account_number,
              currentLateFee: mortgageData.current_late_fee,
              escrowBalance: mortgageData.escrow_balance,
              hasPmi: mortgageData.has_pmi,
              hasPrepaymentPenalty: mortgageData.has_prepayment_penalty,
              interestRatePercentage: mortgageData.interest_rate.percentage,
              interestRateType: mortgageData.interest_rate.type,
              lastPaymentAmount: mortgageData.last_payment_amount,
              lastPaymentDate: mortgageData.last_payment_date,
              loanTerm: mortgageData.loan_term,
              loanTypeDescription: mortgageData.loan_type_description,
              maturityDate: mortgageData.maturity_date,
              nextMonthlyPayment: mortgageData.next_monthly_payment,
              nextPaymentDueDate: mortgageData.next_payment_due_date,
              originationDate: mortgageData.origination_date,
              originationPrincipalAmount: mortgageData.origination_principal_amount,
              pastDueAmount: mortgageData.past_due_amount,
              propertyAddress: mortgageData.property_address,
              ytdInterestPaid: mortgageData.ytd_interest_paid,
              ytdPrincipalPaid: mortgageData.ytd_principal_paid,
              userId,
            },
            { transaction }
          );
        }
      }

      // Handle Student Loans
      if (student) {
        for (const studentData of student) {
        
          await StudentLoan.upsert(
            {
              accountId: studentData.account_id,
              accountNumber: studentData.account_number,
              disbursementDates: studentData.disbursement_dates,
              expectedPayoffDate: studentData.expected_payoff_date,
              guarantor: studentData.guarantor,
              interestRatePercentage: studentData.interest_rate_percentage,
              isOverdue: studentData.is_overdue,
              lastPaymentAmount: studentData.last_payment_amount,
              lastPaymentDate: studentData.last_payment_date,
              lastStatementBalance: studentData.last_statement_balance,
              lastStatementIssueDate: studentData.last_statement_issue_date,
              loanName: studentData.loan_name,
              loanStatus: studentData.loan_status,
              minimumPaymentAmount: studentData.minimum_payment_amount,
              nextPaymentDueDate: studentData.next_payment_due_date,
              originationDate: studentData.origination_date,
              originationPrincipalAmount: studentData.origination_principal_amount,
              outstandingInterestAmount: studentData.outstanding_interest_amount,
              repaymentPlan: studentData.repayment_plan,
              servicerAddress: studentData.servicer_address,
              ytdInterestPaid: studentData.ytd_interest_paid,
              ytdPrincipalPaid: studentData.ytd_principal_paid,
              userId,
            },
            { transaction }
          );
        }
      }

      // Commit the transaction after saving everything
      await transaction.commit();

      const data = {
        message: 'Liabilities data successfully saved',
        data: response?.data,
      };
      res.json(data);
    } catch (error) {
      // Rollback the transaction if something goes wrong
      await transaction.rollback();
      console.error('Error saving data to the database:', error.message || error);
      res.status(500).json({ error: "Error saving data to the database", details: error.message || error });
    }
  } catch (error) {
    console.error("Error fetching liabilities from Plaid:", error.response ? error.response.data : error.message);
    res.status(500).json({ error: "An error occurred fetching liabilities", details: error.response ? error.response.data : error.message });
  }
};


// Controller function to handle the risk score request
const getRiskScoreController = async (req, res) => {

  try {
    const { accessTokens } = req.body; // Array of access tokens from the request body
    if (!Array.isArray(accessTokens) || accessTokens.length === 0) {
      return res.status(400).json({ success: false, message: 'Access tokens are required and must be an array' });
    }
   const token = req.headers.authorization?.split(' ')[1];
   if (!token) {
      return res.status(401).json({ success: false, message: 'No token provided' });
    }

    const results = [];

    for (const accessToken of accessTokens) {
      try {
        // Fetch liabilities data from Plaid API
        const response = await plaidClient.liabilitiesGet({ access_token: accessToken });

        const liabilitiesData = {
          credit: response?.data?.liabilities?.credit || [],
          student: response?.data?.liabilities?.student || [],
          mortgage: response?.data?.liabilities?.mortgage || [],
          accounts: response?.data?.accounts || [],
        };

        // Calculate risk score for the current access token
        const riskData = riskService.getRiskScore(liabilitiesData);

        // Store the result
        results.push({
          accessToken,
          riskScore: riskData.riskScore,
          riskLevel: riskData.riskLevel,
          message: riskData.message,
          // liabilitiesData: response?.data, // Include the original liabilities data if needed
        });
      } catch (error) {
        console.error(`Error fetching liabilities or calculating risk for token ${accessToken}:`, error);
        results.push({
          accessToken,
          error: "Error calculating risk score or fetching liabilities",
        });
      }
    }

    // Return results for all access tokens
    res.status(200).json({
      success: true,
      results,
    });
  } catch (error) {
    console.error("Error processing risk score calculations:", error);
    res.status(500).json({ message: "Error processing risk score calculations", error });
  }
};


const clearOldSessions = async (userId) => {
  console.log("userid-----------------",userId);
  
  try {
    await PlaidUser.update(
      { mostRecentIdvSession: null },
      { where: { user_id: userId } }
    );
    console.log(`Cleared old IDV sessions for user: ${userId}`);
  } catch (error) {
    console.error(`Error clearing old sessions for user ${userId}:`, error);
  }
};

const idvPlaidToken = async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: 'Missing userId' });
    }

    console.log(`Requesting IDV link token for userId: ${userId}`);


   
   

    // Generate the Plaid link token without the invalid `prefill` field
    const tokenResponse = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: 'Cashfluence',
      products: ['identity_verification'],
      identity_verification: {
        template_id: TEMPLATE_ID, // Use the template ID
      },
      country_codes: ['US'],
      language: 'en',
    });

    console.log('Generated Plaid link token:', tokenResponse.data.link_token);

    return res.json({
      link_token: tokenResponse.data.link_token,
      session_id: tokenResponse.data.link_session_id,
    });
  } catch (error) {
    console.error(
      "Error generating Plaid link token:",
      error.response?.data || error.message
    );
    next(error);
  }
};
const updateUserRecordForIDVSession = async (idvSession, userId) => {
  try {
    const plaidResponse = await plaidClient.identityVerificationGet({
      identity_verification_id: idvSession,
    });

     const identityData = plaidResponse.data;
    // const identityData = {
    //   "id": "idv_52xR9LKo77r1Np",
    //   "client_user_id": "your-db-id-3b24110",
    //   "created_at": "2020-07-24T03:26:02Z",
    //   "completed_at": "2020-07-24T03:26:02Z",
    //   "previous_attempt_id": "idv_42cF1MNo42r9Xj",
    //   "shareable_url": "https://flow.plaid.com/verify/idv_4FrXJvfQU3zGUR?key=e004115db797f7cc3083bff3167cba30644ef630fb46f5b086cde6cc3b86a36f",
    //   "template": {
    //     "id": "idvtmp_4FrXJvfQU3zGUR",
    //     "version": 2
    //   },
    //   "user": {
    //     "phone_number": "+12345678909",
    //     "date_of_birth": "1990-05-29",
    //     "ip_address": "192.0.2.42",
    //     "email_address": "user@example.com",
    //     "name": {
    //       "given_name": "Leslie",
    //       "family_name": "Knope"
    //     },
    //     "address": {
    //       "street": "123 Main St.",
    //       "street2": "Unit 42",
    //       "city": "Pawnee",
    //       "region": "IN",
    //       "postal_code": "46001",
    //       "country": "US"
    //     },
    //     "id_number": {
    //       "value": "123456789",
    //       "type": "us_ssn"
    //     }
    //   },
    //   "status": "success",
    //   "steps": {
    //     "accept_tos": "success",
    //     "verify_sms": "success",
    //     "kyc_check": "success",
    //     "documentary_verification": "success",
    //     "selfie_check": "success",
    //     "watchlist_screening": "success",
    //     "risk_check": "success"
    //   },
    //   "documentary_verification": {
    //     "status": "success",
    //     "documents": [
    //       {
    //         "status": "success",
    //         "attempt": 1,
    //         "images": {
    //           "original_front": "https://example.plaid.com/verifications/idv_52xR9LKo77r1Np/documents/1/original_front.jpeg",
    //           "original_back": "https://example.plaid.com/verifications/idv_52xR9LKo77r1Np/documents/1/original_back.jpeg",
    //           "cropped_front": "https://example.plaid.com/verifications/idv_52xR9LKo77r1Np/documents/1/cropped_front.jpeg",
    //           "cropped_back": "https://example.plaid.com/verifications/idv_52xR9LKo77r1Np/documents/1/cropped_back.jpeg",
    //           "face": "https://example.plaid.com/verifications/idv_52xR9LKo77r1Np/documents/1/face.jpeg"
    //         },
    //         "extracted_data": {
    //           "id_number": "AB123456",
    //           "category": "drivers_license",
    //           "expiration_date": "1990-05-29",
    //           "issuing_country": "US",
    //           "issuing_region": "IN",
    //           "date_of_birth": "1990-05-29",
    //           "address": {
    //             "street": "123 Main St. Unit 42",
    //             "city": "Pawnee",
    //             "region": "IN",
    //             "postal_code": "46001",
    //             "country": "US"
    //           },
    //           "name": {
    //             "given_name": "Leslie",
    //             "family_name": "Knope"
    //           }
    //         },
    //         "analysis": {
    //           "authenticity": "match",
    //           "image_quality": "high",
    //           "extracted_data": {
    //             "name": "match",
    //             "date_of_birth": "match",
    //             "expiration_date": "not_expired",
    //             "issuing_country": "match"
    //           }
    //         },
    //         "redacted_at": "2020-07-24T03:26:02Z"
    //       }
    //     ]
    //   },
    //   "selfie_check": {
    //     "status": "success",
    //     "selfies": [
    //       {
    //         "status": "success",
    //         "attempt": 1,
    //         "capture": {
    //           "image_url": "https://example.plaid.com/verifications/idv_52xR9LKo77r1Np/selfie/liveness.jpeg",
    //           "video_url": "https://example.plaid.com/verifications/idv_52xR9LKo77r1Np/selfie/liveness.webm"
    //         },
    //         "analysis": {
    //           "document_comparison": "match",
    //           "liveness_check": "success"
    //         }
    //       }
    //     ]
    //   },
    //   "kyc_check": {
    //     "status": "success",
    //     "address": {
    //       "summary": "match",
    //       "po_box": "yes",
    //       "type": "residential"
    //     },
    //     "name": {
    //       "summary": "match"
    //     },
    //     "date_of_birth": {
    //       "summary": "match"
    //     },
    //     "id_number": {
    //       "summary": "match"
    //     },
    //     "phone_number": {
    //       "summary": "match",
    //       "area_code": "match"
    //     }
    //   },
    //   "risk_check": {
    //     "status": "success",
    //     "behavior": {
    //       "user_interactions": "risky",
    //       "fraud_ring_detected": "yes",
    //       "bot_detected": "yes"
    //     },
    //     "email": {
    //       "is_deliverable": "yes",
    //       "breach_count": 1,
    //       "first_breached_at": "1990-05-29",
    //       "last_breached_at": "1990-05-29",
    //       "domain_registered_at": "1990-05-29",
    //       "domain_is_free_provider": "yes",
    //       "domain_is_custom": "yes",
    //       "domain_is_disposable": "yes",
    //       "top_level_domain_is_suspicious": "yes",
    //       "linked_services": [
    //         "apple"
    //       ]
    //     },
    //     "phone": {
    //       "linked_services": [
    //         "apple"
    //       ]
    //     },
    //     "devices": [
    //       {
    //         "ip_proxy_type": "none_detected",
    //         "ip_spam_list_count": 1,
    //         "ip_timezone_offset": "+06:00:00"
    //       }
    //     ],
    //     "identity_abuse_signals": {
    //       "synthetic_identity": {
    //         "score": 0
    //       },
    //       "stolen_identity": {
    //         "score": 0
    //       }
    //     }
    //   },
    //   "verify_sms": {
    //     "status": "success",
    //     "verifications": [
    //       {
    //         "status": "success",
    //         "attempt": 1,
    //         "phone_number": "+12345678909",
    //         "delivery_attempt_count": 1,
    //         "solve_attempt_count": 1,
    //         "initially_sent_at": "2020-07-24T03:26:02Z",
    //         "last_sent_at": "2020-07-24T03:26:02Z",
    //         "redacted_at": "2020-07-24T03:26:02Z"
    //       }
    //     ]
    //   },
    //   "watchlist_screening_id": "scr_52xR9LKo77r1Np",
    //   "beacon_user_id": "becusr_42cF1MNo42r9Xj",
    //   "redacted_at": "2020-07-24T03:26:02Z",
    //   "request_id": "saKrIBuEB9qJZng"
    // };


    const {
      user,
      status,
      kyc_check,
      risk_check,
      documentary_verification,
      selfie_check,
      watchlist_screening_id,
    } = identityData;

    // Construct a detailed address
    const fullAddress = [
      user.address?.street || '',
      user.address?.street2 || '',
      user.address?.city || '',
      user.address?.region || '',
      user.address?.postal_code || '',
      user.address?.country || '',
    ].filter(Boolean).join(', ');

    // Compile KYC details
    const kycDetails = {
      status: kyc_check?.status,
      summary: {
        address: kyc_check?.address?.summary,
        name: kyc_check?.name?.summary,
        dob: kyc_check?.date_of_birth?.summary,
        id_number: kyc_check?.id_number?.summary,
        phone_number: kyc_check?.phone_number?.summary,
      },
      additional_info: {
        po_box: kyc_check?.address?.po_box,
        phone_area_code: kyc_check?.phone_number?.area_code,
        address_type: kyc_check?.address?.type,
      },
    };

    // Compile documentary verification details
    const documentaryVerificationDetails = documentary_verification?.documents.map((doc) => ({
      status: doc.status,
      attempt: doc.attempt,
      images: doc.images,
      extracted_data: doc.extracted_data,
      analysis: doc.analysis,
    }));

    // Compile selfie check details
    const selfieCheckDetails = {
      status: selfie_check?.status,
      selfies: selfie_check?.selfies.map((selfie) => ({
        status: selfie.status,
        attempt: selfie.attempt,
        capture: selfie.capture,
        analysis: selfie.analysis,
      })),
    };

    // Compile risk check details
    const riskCheckDetails = {
      status: risk_check?.status,
      behavior: risk_check?.behavior,
      email: risk_check?.email,
      phone: risk_check?.phone,
      devices: risk_check?.devices,
      identity_abuse_signals: risk_check?.identity_abuse_signals,
    };


    console.log("documentaryVerificationDetails",documentaryVerificationDetails);
    console.log("riskCheckDetails",riskCheckDetails);
    console.log("selfieCheckDetails",selfieCheckDetails);
    
    // Check if user exists in the database
    const userExists = await PlaidUser.findOne({ where: { user_id: userId } });

    if (!userExists) {
      console.error(`User with user_id ${userId} does not exist. Creating a new record.`);

      // Create a new record
      const newUser = await PlaidUser.create({
        user_id: userId,
        first_name: user.name?.given_name || 'Unknown',
        last_name: user.name?.family_name || 'Unknown',
        dob: user.date_of_birth || null,
        address: fullAddress,
        phone_number: user.phone_number || null,
        email: user.email_address || null,
        plaid_idv_status: status,
        most_recent_idv_session_id: identityData.id,
        kyc_status: kyc_check?.status,
        kyc_details: kycDetails,
        anti_fraud_status: risk_check?.status,
        anti_fraud_details: riskCheckDetails,
        documentary_verification: documentaryVerificationDetails,
        selfie_check: selfieCheckDetails,
        watchlist_screening_id: watchlist_screening_id || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      console.log("New user created:", newUser);

      // Return a standardized response indicating success
      return { created: true, updated: false };
    }

    // Update the existing user record
    console.log("Updating record for userId:", userId);
    const updateStatus = await PlaidUser.update(
      {
        first_name: user.name?.given_name || 'Unknown',
        last_name: user.name?.family_name || 'Unknown',
        dob: user.date_of_birth || null,
        address: fullAddress,
        phone_number: user.phone_number || null,
        email: user.email_address || null,
        plaid_idv_status: status,
        most_recent_idv_session_id: identityData.id,
        kyc_status: kyc_check?.status,
        kyc_details: kycDetails,
        anti_fraud_status: risk_check?.status,
        anti_fraud_details: riskCheckDetails,
        documentary_verification: documentaryVerificationDetails,
        selfie_check: selfieCheckDetails,
        watchlist_screening_id: watchlist_screening_id || null,
        updatedAt: new Date(),
      },
      { where: { user_id: userId } }
    );

    console.log("Update Status:", updateStatus);

    // Return a standardized response indicating success
    return { created: false, updated: updateStatus[0] > 0,status };
  } catch (error) {
    console.error('Error updating user record for IDV session:', error);
    throw new Error('Failed to update user record');
  }
};

const plaidIDVComplete = async (req, res, next) => {
  try {
    const { metadata, userId } = req.body;

    if (!metadata?.link_session_id) {
      return res.status(400).json({ message: 'Missing IDV session ID' });
    }

    // Update user record with the IDV session data
    const sessionStatus = await updateUserRecordForIDVSession(metadata.link_session_id, userId);
    console.log("sessionStatus----------", sessionStatus);

    // Handle user creation and update cases
    if (sessionStatus?.created && sessionStatus?.status === "success") {
      console.log(`New user created with userId: ${userId}`);
      return res.json({ message: 'User created successfully.' });
    }
    if(sessionStatus?.status == "failed"){
      return res.status(500).json({ message: 'Verification failed.' });
    }

    if (sessionStatus?.updated) {
      console.log(`User ${userId} record updated successfully.`);

      // Check if the user still needs to complete verification
      const user = await PlaidUser.findOne({ where: { user_id: userId } });

      if (user.plaid_idv_status !== 'success') {
        return res.json({ message: 'Verification is incomplete.' });
      } else if (user.plaid_idv_status === 'failed') {
        // IDV failed, return 500 error
        return res.status(500).json({ message: 'Verification failed.' });
      } else {
        return res.json({ message: 'User already verified.' });
      }
    }

    // If no rows were updated and no user was created
    return res.status(400).json({ message: 'Failed to update user record' });
  } catch (error) {
    console.error('Error in Plaid IDV complete:', error);
    next(error);  // Forward to error handling middleware
  }
};


const getPlaidUserData = async (req, res) => {
  try {
    // Extract user_id from request query or body
    const { user_id } = req.body; // Assuming you send the user_id in the URL as /api/plaid-user/:user_id

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required" });
    }

    // Fetch the user record
    const plaidUser = await PlaidUser.findOne({
      where: { user_id },
    });

    if (!plaidUser) {
      return res.status(200).json({ message: "Plaid User not found" });
    }

    // Send the detailed user data
    return res.status(200).json({
      message: "Plaid User data retrieved successfully",
      data: plaidUser,
    });
  } catch (error) {
    console.error("Error fetching Plaid user data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const PlaidResetIdv= async (req, res) => {
  const { client_user_id } = req.body;

  try {
    if (!client_user_id) {
      return res.status(400).json({ message: "Missing client_user_id" });
    }

    console.log("Retrying IDV for client_user_id:", client_user_id);

    const request = { 
      client_user_id: client_user_id,
      template_id: TEMPLATE_ID,
      strategy: 'reset',

     };

    const response = await plaidClient.identityVerificationRetry(request);

    console.log("Retry Response:", response.data);

    res.json({
      message: "Identity verification retry initiated successfully",
      data: response.data,
    });
  } catch (error) {
    console.error("Error retrying identity verification:", error.response?.data || error.message);
    res.status(500).json({ message: "Failed to retry identity verification" });
  }
};

const getpliadUserIdvStauts = async (req, res) => {
  try {
    // Extract user_id from request query or body
    const { user_id } = req.body; // Assuming you send the user_id in the URL as /api/plaid-user/:user_id

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required" });
    }

    // Fetch the user record
    const plaidUser = await PlaidUser.findOne({
      where: { user_id },
    });
    console.log("plaiduser....",plaidUser)

    if (!plaidUser) {
      return res.status(200).json({ message: "Plaid User not found" });
    }

    // Send the detailed user data
    return res.status(200).json({
      message: "Plaid User data retrieved successfully",
      data: plaidUser,
    });
  } catch (error) {
    console.error("Error fetching Plaid user data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const getUserDataFromDatabase = async(user_id) =>{
  try {
  
    if (!user_id) {
      return res.status(400).json({ message: "user_id is required" });
    }

    // Fetch the user record
    const userData = await User.findOne({
      where: { id: user_id },
    });
    // console.log("userData....",userData)

    if (!userData) {
      return res.status(404).json({ message: "User not found" });
    }

    // Send the detailed user data
    return userData
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
}

//prefill_idv_data
const prefillUserData =  async (req, res, next) => {
  const { userId } = req.body; 
  try {
    const getUserData = await getUserDataFromDatabase(userId); // Fetch user data from your databas
    const response = await plaidClient.identityVerificationCreate({
      is_shareable: false,
      template_id: TEMPLATE_ID,
      is_idempotent: true,
      user: {
        client_user_id: userId,
        name: { family_name: getUserData.firstName, given_name: getUserData.lastName },
        // address: {
        //   street: userData.street,
        //   city: userData.city,
        //   country: userData.country,
        //   region: userData.region,
        //   postal_code: userData.postalCode,
        // },
        // date_of_birth: userData.dateOfBirth,
        email_address: getUserData.email,
      },
    });

    const idvSession = response.data.id;
    console.log(response.data)
    const updatedData = await updateLatestIDVSession(userId, idvSession);
    return updatedData
  } catch (error) {
    next(error);
  }
}

const updateLatestIDVSession = async (user_id, idvSession) => {
  try {

    if (!user_id || !idvSession) {
      return "user_id and idvSession are required";
    }

    // Update the most_recent_idv_session_id in the database
    const result = await PlaidUser.update(
      { most_recent_idv_session_id: idvSession },
      { where: { user_id } }
    );

    if (result[0] === 0) {
      // No rows were updated
      return  "Plaid User not found or no changes made" ;
    }

    // Respond with success
    return result
  } catch (error) {
    console.error("Error updating IDV session:", error);
  }
};

// const generateSharableUrl = async (req, res, next) => {
//   try {
//     const userId = getLoggedInUserId(req);
//     const { email } = await getUserObject(userId);

//     const response = await plaidClient.identityVerificationCreate({
//       is_shareable: true,
//       template_id: ID_VER_TEMPLATE,
//       is_idempotent: true,
//       user: {
//         client_user_id: userId,
//         email_address: email,
//       },
//     });

//     const idvSession = response.data.id;
//     await updateLatestIDVSession(userId, idvSession);
//     res.json(response.data);
//   } catch (error) {
//     next(error);
//   }
// };










//   const RecentIdvSession = async (req, res, next) => {
//   try {
//     const userId = getLoggedInUserId(req);
//     const result = await updateLatestIDVSession(userId, req.body.idvSession);
//     res.json({ status: result });
//   } catch (error) {
//     next(error);
//   }
// };




const getTransactions = async (req, res) => {
  const { accessToken, startDate, endDate } = req.body;

  if (!accessToken || !startDate || !endDate) {
    return res.status(400).json({ error: "Access token, start date, and end date are required" });
  }

  try {
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    });
  
    res.json(response.data);
  } catch (error) {
    console.error(
      "Error fetching transactions:",
      error.response ? error.response.data : error
    );
    res.status(500).json({ error: "An error occurred fetching transactions" });
  }
};


const getUserAccountData = async (req, res) => {
  const userId = req.query.userId;

  if (!userId) {
    return res.status(400).json({ error: "User not found" });
  }

  try {
    // Fetch all accounts for the given userId
    const accounts = await Account.findAll({
      where: { userId },
      attributes: [
        'accountId',
        'mask',
        'name',
        'officialName',
        'persistentAccountId',
        'subtype',
        'type',
        'institution_name',
        'institution_id',
        'accessToken'
      ],
    });

    if (!accounts.length) {
      return res.status(404).json({ message: 'No accounts found for the given user.' });
    }

    // Collect account data with related information (balances, mortgages, loans)
    const accountData = await Promise.all(
      accounts.map(async (account) => {
        
        const accountId = account.accountId;

        // Fetch related data for each account
        const balances = await Balances.findOne({
          where: { accountId, userId },
          attributes: ['available', 'current', 'isoCurrencyCode', 'limit', 'unofficialCurrencyCode'],
        });

        const mortgage = await Mortgage.findOne({
          where: { accountId, userId },
          attributes: ['accountNumber', 'interestRatePercentage', 'nextPaymentDueDate', 'loanTypeDescription'],
        });

        const studentLoan = await StudentLoan.findOne({
          where: { accountId, userId },
          attributes: ['loanName', 'minimumPaymentAmount', 'nextPaymentDueDate', 'outstandingInterestAmount'],
        });

        // Return simplified account object
        return {
          accountId: account.accountId,
          name: account.name,
          officialName: account.officialName,
          mask: account.mask,
          type: account.type,
          subtype: account.subtype,
          balances: balances || null,
          mortgage: mortgage || null,
          studentLoan: studentLoan || null,
          institution_name: account.institution_name,
          institution_id: account.institution_id,
          accessToken:account.accessToken
        };
      })
    );

    // Group accounts by institution name and ID
    const groupedData = accountData.reduce((result, account) => {
      const key = `${account.institution_name}-${account.institution_id}`;

      if (!result[key]) {
        result[key] = {
          institution_name: account.institution_name,
          institution_id: account.institution_id,
          accessToken:account.accessToken,
          accounts: [],
        };
      }

      result[key].accounts.push({
        accountId: account.accountId,
        name: account.name,
        officialName: account.officialName,
        mask: account.mask,
        type: account.type,
        subtype: account.subtype,
        balances: account.balances,
        mortgage: account.mortgage,
        studentLoan: account.studentLoan,
      
      });

      return result;
    }, {});

    // Convert the grouped data into an array
    const response = Object.values(groupedData);

    // Send the grouped response
    return res.status(200).json(response);
  } catch (error) {
    console.error('Error fetching user data:', error);
    return res.status(500).json({ message: 'Failed to fetch user data.', error: error.message });
  }
};

const testVercel = async (req, res) => {
  res.status(201).json({ success: true, data: "Hello, this is for testing purpose" });
};

module.exports = {
  createLinkToken,
  plaidPublicToken,
  getLiabilities,getpliadUserIdvStauts,
  getTransactions,getUserAccountData,
  getRiskScoreController,idvPlaidToken,
  plaidIDVComplete,clearOldSessions,
  getPlaidUserData,PlaidResetIdv,
  prefillUserData,
  testVercel
};
