// const { plaidClient } = require("../config/plaidConfig");
// const User = require("../models/User");
// const { Op } = require("sequelize"); // Import Sequelize operators

// const PlaidUser = require("../models/PlaidUser");
// const { Account, Balances, Mortgage, StudentLoan,Credit } = require("../models/Plaid");

// const { sequelize } = require("../config/db");
// const riskService = require("../services/riskServices");
// const TEMPLATE_ID = process.env.TEMPLATE_ID;
// const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
// const PLAID_SECRET = process.env.PLAID_SECRET;

// const PLAID_ENV = process.env.PLAID_ENV;
// console.log("TEMPLATE_ID", TEMPLATE_ID);

// // Function to create link token
// const createLinkToken = async (req, res) => {
//   try {
//     const response = await plaidClient.linkTokenCreate({
//       user: {
//         client_user_id: "unique_user_id",
//       },
//       client_name: "Cashfluence",
//       products: ["liabilities"], // products as needed
//       country_codes: ["US"],
//       language: "en",
//     });

//     const linkToken = response.data.link_token;

//     // Return the link token to the client
//     res.json({ link_token: linkToken });
//   } catch (error) {
//     console.error(
//       "Error creating link token:",
//       error.response?.data || error.message
//     );
//     res
//       .status(500)
//       .json({ error: "An error occurred while creating the link token" });
//   }
// };

// const plaidPublicToken = async (req, res) => {
//   const { public_token } = req.body;

//   try {
//     const response = await plaidClient.itemPublicTokenExchange({
//       public_token,
//     });

//     const accessToken = response.data.access_token;
//     const itemId = response.data.item_id;

//     // Return the access token and item ID to the frontend
//     res.json({ accessToken, itemId });
//   } catch (error) {
//     console.error(
//       "Error exchanging public token:",
//       error.response?.data || error.message
//     );
//     res.status(500).json({ error: "An error occurred exchanging the token" });
//   }
// };

// const getLiabilities = async (req, res) => {
//   const { accessToken } = req.body;
//   const userId = req?.query?.userId;

//   if (!accessToken) {
//     return res.status(400).json({ error: "Access token is required" });
//   }

//   if (!userId) {
//     return res.status(400).json({ error: "User not found" });
//   }

//   const token = req.headers.authorization?.split(" ")[1];

//   if (!token) {
//     return res
//       .status(401)
//       .json({ success: false, message: "No token provided" });
//   }

//   try {
//     // Fetch liabilities from Plaid API
//     const response = await plaidClient.liabilitiesGet({
//       access_token: accessToken,
//     });

//     // Start a database transaction to ensure atomicity
//     const transaction = await sequelize.transaction();

//     try {
//       const { accounts, liabilities, item } = response.data;
//       const { mortgage, student,credit } = liabilities;
//       const institutionName = item?.institution_name;
//       const institutionId = item?.institution_id;
//       userId;

//       // Upsert Account Data
//       for (const accountData of accounts) {
//         await Account.upsert(
//           {
//             accountId: accountData.account_id,
//             accessToken,
//             mask: accountData.mask,
//             name: accountData.name,
//             officialName: accountData.official_name || null,
//             persistentAccountId: accountData.persistent_account_id,
//             subtype: accountData.subtype,
//             type: accountData.type,
//             userId,
//             institution_name: institutionName,
//             institution_id: institutionId,
//           },
//           { transaction }
//         );

//         // Upsert Balances
//         if (accountData.balances) {
//           await Balances.upsert(
//             {
//               accountId: accountData.account_id,
//               available: accountData.balances.available,
//               current: accountData.balances.current,
//               isoCurrencyCode: accountData.balances.iso_currency_code,
//               limit: accountData.balances.limit,
//               unofficialCurrencyCode:
//                 accountData.balances.unofficial_currency_code,
//               userId,
//             },
//             { transaction }
//           );
//         }
//       }

//       // Handle Mortgages
//       if (mortgage) {
//         for (const mortgageData of mortgage) {
//           await Mortgage.upsert(
//             {
//               accountId: mortgageData.account_id,
//               accountNumber: mortgageData.account_number,
//               currentLateFee: mortgageData.current_late_fee,
//               escrowBalance: mortgageData.escrow_balance,
//               hasPmi: mortgageData.has_pmi,
//               hasPrepaymentPenalty: mortgageData.has_prepayment_penalty,
//               interestRatePercentage: mortgageData.interest_rate.percentage,
//               interestRateType: mortgageData.interest_rate.type,
//               lastPaymentAmount: mortgageData.last_payment_amount,
//               lastPaymentDate: mortgageData.last_payment_date,
//               loanTerm: mortgageData.loan_term,
//               loanTypeDescription: mortgageData.loan_type_description,
//               maturityDate: mortgageData.maturity_date,
//               nextMonthlyPayment: mortgageData.next_monthly_payment,
//               nextPaymentDueDate: mortgageData.next_payment_due_date,
//               originationDate: mortgageData.origination_date,
//               originationPrincipalAmount:
//                 mortgageData.origination_principal_amount,
//               pastDueAmount: mortgageData.past_due_amount,
//               propertyAddress: mortgageData.property_address,
//               ytdInterestPaid: mortgageData.ytd_interest_paid,
//               ytdPrincipalPaid: mortgageData.ytd_principal_paid,
//               userId,
//             },
//             { transaction }
//           );
//         }
//       }

//       if (credit) {
//         for (const creditData of credit) {
//           await Credit.upsert(
//             {
//               accountId: creditData.account_id,
//               aprs: creditData.aprs,
//               isOverdue: creditData.is_overdue,
//               lastPaymentAmount: creditData.last_payment_amount,
//               lastPaymentDate: creditData.last_payment_date,
//               lastStatementBalance: creditData.last_statement_balance,
//               lastStatementIssueDate: creditData.last_statement_issue_date,
//               minimumPaymentAmount: creditData.minimum_payment_amount,
//               nextPaymentDueDate: creditData.next_payment_due_date,
//               userId,
//             },
//             { transaction }
//           );
//         }
//       }
//       // Handle Student Loans
//       if (student) {
//         for (const studentData of student) {
//           await StudentLoan.upsert(
//             {
//               accountId: studentData.account_id,
//               accountNumber: studentData.account_number,
//               disbursementDates: studentData.disbursement_dates,
//               expectedPayoffDate: studentData.expected_payoff_date,
//               guarantor: studentData.guarantor,
//               interestRatePercentage: studentData.interest_rate_percentage,
//               isOverdue: studentData.is_overdue,
//               lastPaymentAmount: studentData.last_payment_amount,
//               lastPaymentDate: studentData.last_payment_date,
//               lastStatementBalance: studentData.last_statement_balance,
//               lastStatementIssueDate: studentData.last_statement_issue_date,
//               loanName: studentData.loan_name,
//               loanStatus: studentData.loan_status,
//               minimumPaymentAmount: studentData.minimum_payment_amount,
//               nextPaymentDueDate: studentData.next_payment_due_date,
//               originationDate: studentData.origination_date,
//               originationPrincipalAmount:
//                 studentData.origination_principal_amount,
//               outstandingInterestAmount:
//                 studentData.outstanding_interest_amount,
//               repaymentPlan: studentData.repayment_plan,
//               servicerAddress: studentData.servicer_address,
//               ytdInterestPaid: studentData.ytd_interest_paid,
//               ytdPrincipalPaid: studentData.ytd_principal_paid,
//               userId,
//             },
//             { transaction }
//           );
//         }
//       }

//       // Commit the transaction after saving everything
//       await transaction.commit();

//       const data = {
//         message: "Liabilities data successfully saved",
//         data: response?.data,
//       };
//       res.json(data);
//     } catch (error) {
//       // Rollback the transaction if something goes wrong
//       await transaction.rollback();
//       console.error(
//         "Error saving data to the database:",
//         error.message || error
//       );
//       res
//         .status(500)
//         .json({
//           error: "Error saving data to the database",
//           details: error.message || error,
//         });
//     }
//   } catch (error) {
//     console.error(
//       "Error fetching liabilities from Plaid:",
//       error.response ? error.response.data : error.message
//     );
//     res
//       .status(500)
//       .json({
//         error: "An error occurred fetching liabilities",
//         details: error.response ? error.response.data : error.message,
//       });
//   }
// };

// // Controller function to handle the risk score request
// const getRiskScoreController = async (req, res) => {
//   try {
//     const { accessTokens } = req.body; // Array of access tokens from the request body
//     if (!Array.isArray(accessTokens) || accessTokens.length === 0) {
//       return res
//         .status(400)
//         .json({
//           success: false,
//           message: "Access tokens are required and must be an array",
//         });
//     }
//     const token = req.headers.authorization?.split(" ")[1];
//     if (!token) {
//       return res
//         .status(401)
//         .json({ success: false, message: "No token provided" });
//     }

//     const results = [];

//     for (const accessToken of accessTokens) {
//       try {
//         // Fetch liabilities data from Plaid API
//         const response = await plaidClient.liabilitiesGet({
//           access_token: accessToken,
//         });

//         const liabilitiesData = {
//           credit: response?.data?.liabilities?.credit || [],
//           student: response?.data?.liabilities?.student || [],
//           mortgage: response?.data?.liabilities?.mortgage || [],
//           accounts: response?.data?.accounts || [],
//         };

//         console.log("liabilitiesData-------------",liabilitiesData);
        

//         // Calculate risk score for the current access token
//         const riskData = riskService.getRiskScore(liabilitiesData);

//         // Store the result
//         results.push({
//           accessToken,
//           riskScore: riskData.riskScore,
//           riskLevel: riskData.riskLevel,
//           message: riskData.message,
//           // liabilitiesData: response?.data, // Include the original liabilities data if needed
//         });
//       } catch (error) {
//         console.error(
//           `Error fetching liabilities or calculating risk for token ${accessToken}:`,
//           error
//         );
//         results.push({
//           accessToken,
//           error: "Error calculating risk score or fetching liabilities",
//         });
//       }
//     }

//     // Return results for all access tokens
//     res.status(200).json({
//       success: true,
//       results,
//     });
//   } catch (error) {
//     console.error("Error processing risk score calculations:", error);
//     res
//       .status(500)
//       .json({ message: "Error processing risk score calculations", error });
//   }
// };

// const getBankAccountData = async (req, res) => {
//   const userId = 256; // Example userId

//   try {
//     // Step 1: Fetch all account IDs from Account table
//     const accountRecords = await Account.findAll({
//       where: { userId },
//       attributes: ["accountId"], // Get only accountId
//     });

//     // Step 2: Fetch all account IDs from other tables where userId is present
//     const creditRecords = await Credit.findAll({
//       where: { userId },
//       attributes: ["accountId"],
//     });

//     const mortgageRecords = await Mortgage.findAll({
//       where: { userId },
//       attributes: ["accountId"],
//     });

//     const studentLoanRecords = await StudentLoan.findAll({
//       where: { userId },
//       attributes: ["accountId"],
//     });

//     // Step 3: Collect all account IDs and remove duplicates
//     const accountIds = [
//       ...new Set([
//         ...accountRecords.map((a) => a.accountId),
//         ...creditRecords.map((c) => c.accountId),
//         ...mortgageRecords.map((m) => m.accountId),
//         ...studentLoanRecords.map((s) => s.accountId),
//       ]),
//     ];

//     if (accountIds.length === 0) {
//       return res.status(404).json({ message: "No accounts found for user" });
//     }

//     console.log("User's Account IDs:", accountIds);

//     // Step 4: Fetch all related data using these accountIds
//     const accountData = await Account.findAll({
//       where: { accountId: { [Op.in]: accountIds } }, // Fetch data for multiple accountIds
//       include: [
//         { model: Balances, required: false },
//         { model: Credit, required: false },
//         { model: Mortgage, required: false },
//         { model: StudentLoan, required: false },
//       ],
//     });

//     if (!accountData || accountData.length === 0) {
//       return res.status(404).json({ message: "No financial data found for accounts" });
//     }

//     // Step 5: Structure the data for risk calculation
//     const data = accountData.map((account) => ({
//       accountId: account.accountId,
//       credit: account.Credit
//         ? [
//             {
//               is_overdue: account.Credit.isOverdue,
//               aprs: Array.isArray(account.Credit.aprs)
//                 ? account.Credit.aprs.map((apr) => ({
//                     balance_subject_to_apr: apr.balance_subject_to_apr,
//                     apr_percentage: apr.apr_percentage,
//                   }))
//                 : [],
//               next_payment_due_date: account.Credit.nextPaymentDueDate,
//             },
//           ]
//         : [],
//       student: account.StudentLoan
//         ? [
//             {
//               is_overdue: account.StudentLoan.isOverdue,
//               outstanding_interest_amount: account.StudentLoan.outstandingInterestAmount,
//               pslf_status: account.StudentLoan.pslfStatus
//                 ? account.StudentLoan.pslfStatus.payments_remaining
//                 : 0,
//             },
//           ]
//         : [],
//       mortgage: account.Mortgage
//         ? [
//             {
//               past_due_amount: account.Mortgage.pastDueAmount,
//               current_late_fee: account.Mortgage.currentLateFee,
//               has_pmi: account.Mortgage.hasPmi,
//             },
//           ]
//         : [],
//       accounts: account.Balance
//         ? [
//             {
//               available: account.Balance.available,
//             },
//           ]
//         : [],
//     }));

//     return res.status(200).json({
//       data,
//       message: "Bank data fetched successfully",
//     });
//   } catch (error) {
//     console.error("Error fetching data:", error);
//     return res.status(500).json({ message: "Internal Server Error" });
//   }
// };


// const clearOldSessions = async (userId) => {
//   try {
//     await PlaidUser.update(
//       { mostRecentIdvSession: null },
//       { where: { user_id: userId } }
//     );
//     console.log(`Cleared old IDV sessions for user: ${userId}`);
//   } catch (error) {
//     console.error(`Error clearing old sessions for user ${userId}:`, error);
//   }
// };

// const idvPlaidToken = async (req, res, next) => {
//   try {
//     const { userId } = req.body;

//     if (!userId) {
//       return res.status(400).json({ message: "Missing userId" });
//     }

//     console.log(`Requesting IDV link token for userId: ${userId}`);

//     // Generate the Plaid link token without the invalid `prefill` field
//     const tokenResponse = await plaidClient.linkTokenCreate({
//       user: { client_user_id: userId },
//       client_name: "Cashfluence",
//       products: ["identity_verification"],
//       identity_verification: {
//         template_id: TEMPLATE_ID, // Use the template ID
//       },
//       country_codes: ["US"],
//       language: "en",
//     });

//     console.log("Generated Plaid link token:", tokenResponse.data.link_token);

//     return res.json({
//       link_token: tokenResponse.data.link_token,
//       session_id: tokenResponse.data.link_session_id,
//     });
//   } catch (error) {
//     console.error(
//       "Error generating Plaid link token:",
//       error.response?.data || error.message
//     );
//     next(error);
//   }
// };
// const updateUserRecordForIDVSession = async (idvSession, userId) => {
//   try {
//     const plaidResponse = await plaidClient.identityVerificationGet({
//       identity_verification_id: idvSession,
//     });

//     const identityData = plaidResponse.data;

//     const {
//       user,
//       status,
//       kyc_check,
//       risk_check,
//       documentary_verification,
//       selfie_check,
//       watchlist_screening_id,
//     } = identityData;

//     // Construct a detailed address
//     const fullAddress = [
//       user.address?.street || "",
//       user.address?.street2 || "",
//       user.address?.city || "",
//       user.address?.region || "",
//       user.address?.postal_code || "",
//       user.address?.country || "",
//     ]
//       .filter(Boolean)
//       .join(", ");

//     // Compile KYC details
//     const kycDetails = {
//       status: kyc_check?.status,
//       summary: {
//         address: kyc_check?.address?.summary,
//         name: kyc_check?.name?.summary,
//         dob: kyc_check?.date_of_birth?.summary,
//         id_number: kyc_check?.id_number?.summary,
//         phone_number: kyc_check?.phone_number?.summary,
//       },
//       additional_info: {
//         po_box: kyc_check?.address?.po_box,
//         phone_area_code: kyc_check?.phone_number?.area_code,
//         address_type: kyc_check?.address?.type,
//       },
//     };

//     // Compile documentary verification details
//     const documentaryVerificationDetails =
//       documentary_verification?.documents.map((doc) => ({
//         status: doc.status,
//         attempt: doc.attempt,
//         images: doc.images,
//         extracted_data: doc.extracted_data,
//         analysis: doc.analysis,
//       }));

//     // Compile selfie check details
//     const selfieCheckDetails = {
//       status: selfie_check?.status,
//       selfies: selfie_check?.selfies.map((selfie) => ({
//         status: selfie.status,
//         attempt: selfie.attempt,
//         capture: selfie.capture,
//         analysis: selfie.analysis,
//       })),
//     };

//     // Compile risk check details
//     const riskCheckDetails = {
//       status: risk_check?.status,
//       behavior: risk_check?.behavior,
//       email: risk_check?.email,
//       phone: risk_check?.phone,
//       devices: risk_check?.devices,
//       identity_abuse_signals: risk_check?.identity_abuse_signals,
//     };

//     console.log(
//       "documentaryVerificationDetails",
//       documentaryVerificationDetails
//     );
//     console.log("riskCheckDetails", riskCheckDetails);
//     console.log("selfieCheckDetails", selfieCheckDetails);

//     // Check if user exists in the database
//     const userExists = await PlaidUser.findOne({ where: { user_id: userId } });

//     if (!userExists) {
//       console.error(
//         `User with user_id ${userId} does not exist. Creating a new record.`
//       );

//       // Create a new record
//       const newUser = await PlaidUser.create({
//         user_id: userId,
//         first_name: user.name?.given_name || "Unknown",
//         last_name: user.name?.family_name || "Unknown",
//         dob: user.date_of_birth || null,
//         address: fullAddress,
//         phone_number: user.phone_number || null,
//         email: user.email_address || null,
//         plaid_idv_status: status,
//         most_recent_idv_session_id: identityData.id,
//         kyc_status: kyc_check?.status,
//         kyc_details: kycDetails,
//         anti_fraud_status: risk_check?.status,
//         anti_fraud_details: riskCheckDetails,
//         documentary_verification: documentaryVerificationDetails,
//         selfie_check: selfieCheckDetails,
//         watchlist_screening_id: watchlist_screening_id || null,
//         createdAt: new Date(),
//         updatedAt: new Date(),
//       });

//       console.log("New user created:", newUser);

//       // Return a standardized response indicating success
//       return { created: true, updated: false };
//     }

//     // Update the existing user record
//     console.log("Updating record for userId:", userId);
//     const updateStatus = await PlaidUser.update(
//       {
//         first_name: user.name?.given_name || "Unknown",
//         last_name: user.name?.family_name || "Unknown",
//         dob: user.date_of_birth || null,
//         address: fullAddress,
//         phone_number: user.phone_number || null,
//         email: user.email_address || null,
//         plaid_idv_status: status,
//         most_recent_idv_session_id: identityData.id,
//         kyc_status: kyc_check?.status,
//         kyc_details: kycDetails,
//         anti_fraud_status: risk_check?.status,
//         anti_fraud_details: riskCheckDetails,
//         documentary_verification: documentaryVerificationDetails,
//         selfie_check: selfieCheckDetails,
//         watchlist_screening_id: watchlist_screening_id || null,
//         updatedAt: new Date(),
//       },
//       { where: { user_id: userId } }
//     );

//     console.log("Update Status:", updateStatus);

//     // Return a standardized response indicating success
//     return { created: false, updated: updateStatus[0] > 0, status };
//   } catch (error) {
//     console.error("Error updating user record for IDV session:", error);
//     throw new Error("Failed to update user record");
//   }
// };

// const plaidIDVComplete = async (req, res, next) => {
//   try {
//     const { metadata, userId } = req.body;

//     if (!metadata?.link_session_id) {
//       return res.status(400).json({ message: "Missing IDV session ID" });
//     }

//     // Update user record with the IDV session data
//     const sessionStatus = await updateUserRecordForIDVSession(
//       metadata.link_session_id,
//       userId
//     );

//     // Handle user creation and update cases
//     if (sessionStatus?.created && sessionStatus?.status === "success") {
//       console.log(`New user created with userId: ${userId}`);
//       return res.json({ message: "User created successfully." });
//     }
//     if (sessionStatus?.status == "failed") {
//       return res.status(500).json({ message: "Verification failed." });
//     }

//     if (sessionStatus?.updated) {
//       console.log(`User ${userId} record updated successfully.`);

//       // Check if the user still needs to complete verification
//       const user = await PlaidUser.findOne({ where: { user_id: userId } });

//       if (user.plaid_idv_status !== "success") {
//         return res.json({ message: "Verification is incomplete." });
//       } else if (user.plaid_idv_status === "failed") {
//         // IDV failed, return 500 error
//         return res.status(500).json({ message: "Verification failed." });
//       } else {
//         return res.json({ message: "User already verified." });
//       }
//     }

//     // If no rows were updated and no user was created
//     return res.status(500).json({ message: "Internal server error" });
//   } catch (error) {
//     console.error("Error in Plaid IDV complete:", error);
//     next(error); // Forward to error handling middleware
//   }
// };

// const getPlaidUserData = async (req, res) => {
//   try {
//     // Extract user_id from request query or body
//     const { user_id } = req.body; // Assuming you send the user_id in the URL as /api/plaid-user/:user_id

//     if (!user_id) {
//       return res.status(400).json({ message: "user_id is required" });
//     }

//     // Fetch the user record
//     const plaidUser = await PlaidUser.findOne({
//       where: { user_id },
//     });

//     if (!plaidUser) {
//       return res.status(200).json({ message: "Plaid User not found" });
//     }

//     // Send the detailed user data
//     return res.status(200).json({
//       message: "Plaid User data retrieved successfully",
//       data: plaidUser,
//     });
//   } catch (error) {
//     console.error("Error fetching Plaid user data:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// const getPlaidUserState = async (req, res) => {
//   try {
//     // Extract user_id from request query or body
//     const { user_id } = req.body;

//     if (!user_id) {
//       return res.status(400).json({ message: "user_id is required" });
//     }

//     // Fetch the user record
//     const plaidUser = await PlaidUser.findOne({
//       where: { user_id },
//     });

//     if (!plaidUser) {
//       return res.status(200).json({
//         message:
//           "Plaid User not found. Please complete identity verification and KYC on the profile page.",
//       });
//     }

//     // Extract the address from the user's data
//     const { address } = plaidUser;

//     if (!address) {
//       return res.status(200).json({
//         message:
//           "Address not found for the user. Please complete your profile.",
//       });
//     }

//     // Parse the address to extract the state
//     const addressParts = address.split(",").map((part) => part.trim());

//     // Ensure the address has enough parts to contain a state
//     if (addressParts.length >= 4) {
//       // The state is typically the third-to-last part in the address
//       const state = addressParts[addressParts.length - 3]; // The part that should contain the state

//       // If the state is a two-letter abbreviation, return it
//       if (state && state.length === 2) {
//         return res.status(200).json({
//           message: "State retrieved successfully",
//           state,
//         });
//       } else {
//         return res.status(200).json({
//           message:
//             "State not found or invalid format. Please verify your address.",
//         });
//       }
//     } else {
//       return res.status(200).json({
//         message: "Invalid address format. Please verify your address.",
//       });
//     }
//   } catch (error) {
//     console.error("Error fetching Plaid user data:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// const PlaidResetIdv = async (req, res) => {
//   const { client_user_id } = req.body;

//   try {
//     if (!client_user_id) {
//       return res.status(400).json({ message: "Missing client_user_id" });
//     }

//     console.log("Retrying IDV for client_user_id:", client_user_id);

//     const request = {
//       client_user_id: client_user_id,
//       template_id: TEMPLATE_ID,
//       strategy: "reset",
//     };

//     const response = await plaidClient.identityVerificationRetry(request);

//     console.log("Retry Response:", response.data);

//     res.json({
//       message: "Identity verification retry initiated successfully",
//       data: response.data,
//     });
//   } catch (error) {
//     console.error(
//       "Error retrying identity verification:",
//       error.response?.data || error.message
//     );
//     res.status(500).json({ message: "Failed to retry identity verification" });
//   }
// };

// const getpliadUserIdvStauts = async (req, res) => {
//   try {
//     // Extract user_id from request query or body
//     const { user_id } = req.body; // Assuming you send the user_id in the URL as /api/plaid-user/:user_id

//     if (!user_id) {
//       return res.status(400).json({ message: "user_id is required" });
//     }

//     // Fetch the user record
//     const plaidUser = await PlaidUser.findOne({
//       where: { user_id },
//     });
//     console.log("plaiduser....", plaidUser);

//     if (!plaidUser) {
//       return res.status(200).json({ message: "Plaid User not found" });
//     }

//     // Send the detailed user data
//     return res.status(200).json({
//       message: "Plaid User data retrieved successfully",
//       data: plaidUser,
//     });
//   } catch (error) {
//     console.error("Error fetching Plaid user data:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// const getUserDataFromDatabase = async (user_id) => {
//   try {
//     if (!user_id) {
//       return res.status(400).json({ message: "user_id is required" });
//     }

//     // Fetch the user record
//     const userData = await User.findOne({
//       where: { id: user_id },
//     });
//     // console.log("userData....",userData)

//     if (!userData) {
//       return res.status(404).json({ message: "User not found" });
//     }

//     // Send the detailed user data
//     return userData;
//   } catch (error) {
//     console.error("Error fetching user data:", error);
//     return res.status(500).json({ message: "Internal server error" });
//   }
// };

// //prefill_idv_data
// const prefillUserData = async (req, res, next) => {
//   const { userId } = req.body;
//   try {
//     const getUserData = await getUserDataFromDatabase(userId); // Fetch user data from your databas
//     const response = await plaidClient.identityVerificationCreate({
//       is_shareable: false,
//       template_id: TEMPLATE_ID,
//       is_idempotent: true,
//       user: {
//         client_user_id: userId,
//         name: {
//           family_name: getUserData.firstName,
//           given_name: getUserData.lastName,
//         },
//         // address: {
//         //   street: userData.street,
//         //   city: userData.city,
//         //   country: userData.country,
//         //   region: userData.region,
//         //   postal_code: userData.postalCode,
//         // },
//         // date_of_birth: userData.dateOfBirth,
//         email_address: getUserData.email,
//       },
//     });

//     const idvSession = response.data.id;
//     console.log(response.data);
//     const updatedData = await updateLatestIDVSession(userId, idvSession);
//     return updatedData;
//   } catch (error) {
//     next(error);
//   }
// };

// const updateLatestIDVSession = async (user_id, idvSession) => {
//   try {
//     if (!user_id || !idvSession) {
//       return "user_id and idvSession are required";
//     }

//     // Update the most_recent_idv_session_id in the database
//     const result = await PlaidUser.update(
//       { most_recent_idv_session_id: idvSession },
//       { where: { user_id } }
//     );

//     if (result[0] === 0) {
//       // No rows were updated
//       return "Plaid User not found or no changes made";
//     }

//     // Respond with success
//     return result;
//   } catch (error) {
//     console.error("Error updating IDV session:", error);
//   }
// };

// // const generateSharableUrl = async (req, res, next) => {
// //   try {
// //     const userId = getLoggedInUserId(req);
// //     const { email } = await getUserObject(userId);

// //     const response = await plaidClient.identityVerificationCreate({
// //       is_shareable: true,
// //       template_id: ID_VER_TEMPLATE,
// //       is_idempotent: true,
// //       user: {
// //         client_user_id: userId,
// //         email_address: email,
// //       },
// //     });

// //     const idvSession = response.data.id;
// //     await updateLatestIDVSession(userId, idvSession);
// //     res.json(response.data);
// //   } catch (error) {
// //     next(error);
// //   }
// // };

// //   const RecentIdvSession = async (req, res, next) => {
// //   try {
// //     const userId = getLoggedInUserId(req);
// //     const result = await updateLatestIDVSession(userId, req.body.idvSession);
// //     res.json({ status: result });
// //   } catch (error) {
// //     next(error);
// //   }
// // };

// const getTransactions = async (req, res) => {
//   const { accessToken, startDate, endDate } = req.body;

//   if (!accessToken || !startDate || !endDate) {
//     return res
//       .status(400)
//       .json({ error: "Access token, start date, and end date are required" });
//   }

//   try {
//     const response = await plaidClient.transactionsGet({
//       access_token: accessToken,
//       start_date: startDate,
//       end_date: endDate,
//     });

//     res.json(response.data);
//   } catch (error) {
//     console.error(
//       "Error fetching transactions:",
//       error.response ? error.response.data : error
//     );
//     res.status(500).json({ error: "An error occurred fetching transactions" });
//   }
// };

// const getUserAccountData = async (req, res) => {
//   const userId = req.query.userId;

//   if (!userId) {
//     return res.status(400).json({ error: "User not found" });
//   }

//   try {
//     // Fetch all accounts for the given userId
//     const accounts = await Account.findAll({
//       where: { userId },
//       attributes: [
//         "accountId",
//         "mask",
//         "name",
//         "officialName",
//         "persistentAccountId",
//         "subtype",
//         "type",
//         "institution_name",
//         "institution_id",
//         "accessToken",
//       ],
//     });

//     if (!accounts.length) {
//       return res
//         .status(404)
//         .json({ message: "No accounts found for the given user." });
//     }

//     // Collect account data with related information (balances, mortgages, loans)
//     const accountData = await Promise.all(
//       accounts.map(async (account) => {
//         const accountId = account.accountId;

//         // Fetch related data for each account
//         const balances = await Balances.findOne({
//           where: { accountId, userId },
//           attributes: [
//             "available",
//             "current",
//             "isoCurrencyCode",
//             "limit",
//             "unofficialCurrencyCode",
//           ],
//         });

//         const mortgage = await Mortgage.findOne({
//           where: { accountId, userId },
//           attributes: [
//             "accountNumber",
//             "interestRatePercentage",
//             "nextPaymentDueDate",
//             "loanTypeDescription",
//           ],
//         });

//         const studentLoan = await StudentLoan.findOne({
//           where: { accountId, userId },
//           attributes: [
//             "loanName",
//             "minimumPaymentAmount",
//             "nextPaymentDueDate",
//             "outstandingInterestAmount",
//           ],
//         });

//         // Return simplified account object
//         return {
//           accountId: account.accountId,
//           name: account.name,
//           officialName: account.officialName,
//           mask: account.mask,
//           type: account.type,
//           subtype: account.subtype,
//           balances: balances || null,
//           mortgage: mortgage || null,
//           studentLoan: studentLoan || null,
//           institution_name: account.institution_name,
//           institution_id: account.institution_id,
//           accessToken: account.accessToken,
//         };
//       })
//     );

//     // Group accounts by institution name and ID
//     const groupedData = accountData.reduce((result, account) => {
//       const key = `${account.institution_name}-${account.institution_id}`;

//       if (!result[key]) {
//         result[key] = {
//           institution_name: account.institution_name,
//           institution_id: account.institution_id,
//           accessToken: account.accessToken,
//           accounts: [],
//         };
//       }

//       result[key].accounts.push({
//         accountId: account.accountId,
//         name: account.name,
//         officialName: account.officialName,
//         mask: account.mask,
//         type: account.type,
//         subtype: account.subtype,
//         balances: account.balances,
//         mortgage: account.mortgage,
//         studentLoan: account.studentLoan,
//       });

//       return result;
//     }, {});

//     // Convert the grouped data into an array
//     const response = Object.values(groupedData);

//     // Send the grouped response
//     return res.status(200).json(response);
//   } catch (error) {
//     console.error("Error fetching user data:", error);
//     return res
//       .status(500)
//       .json({ message: "Failed to fetch user data.", error: error.message });
//   }
// };

// const getAverageBalance = async (req, res) => {
//   const { accessToken, startDate, endDate } = req.body;

//   if (!accessToken || !startDate || !endDate) {
//     return res
//       .status(400)
//       .json({ error: "Access token, start date, and end date are required" });
//   }

//   try {

//     console.log("hlo");
    
//     const response = await plaidClient.transactionsGet({
//       access_token: accessToken,
//       start_date: startDate,
//       end_date: endDate,
//     });

//     const { accounts, transactions } = response.data;

//     if (!accounts.length) {
//       return res.status(400).json({ error: "No accounts found" });
//     }

//     // Current Balance
//     const currentBalance = accounts[0].balances.current;

//     // Transactions Total
//     let totalTransactionAmount = transactions.reduce((sum, txn) => sum + txn.amount, 0);
    
//     // Total Transactions Count
//     let totalTransactions = transactions.length;

//     // Average Balance Calculation
//     let averageBalance = (currentBalance + totalTransactionAmount) / (totalTransactions + 1);

//     res.json({ currentBalance, averageBalance: averageBalance.toFixed(2) });

//   } catch (error) {
//     console.error("Error fetching transactions:", error.response ? error.response.data : error);
//     res.status(500).json({ error: "An error occurred fetching transactions" });
//   }
// };




// module.exports = {
//   createLinkToken,
//   plaidPublicToken,
//   getLiabilities,
//   getpliadUserIdvStauts,
//   getTransactions,
//   getUserAccountData,
//   getRiskScoreController,
//   idvPlaidToken,
//   plaidIDVComplete,
//   clearOldSessions,
//   getPlaidUserData,
//   PlaidResetIdv,
//   prefillUserData,
//   getPlaidUserState,
//   getBankAccountData,
//   getAverageBalance
// };
const { plaidClient } = require("../config/plaidConfig");
const User = require("../models/User");
const { Op } = require("sequelize"); // Import Sequelize operators

const PlaidUser = require("../models/PlaidUser");
const { Account, Balances, Mortgage, StudentLoan,Credit } = require("../models/Plaid");

const { sequelize } = require("../config/db");
const riskService = require("../services/riskServices");
const TEMPLATE_ID = process.env.TEMPLATE_ID;
const PLAID_CLIENT_ID = process.env.PLAID_CLIENT_ID;
const PLAID_SECRET = process.env.PLAID_SECRET;

const PLAID_ENV = process.env.PLAID_ENV;
console.log("TEMPLATE_ID", TEMPLATE_ID);

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

  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res
      .status(401)
      .json({ success: false, message: "No token provided" });
  }

  try {
    // Fetch liabilities from Plaid API
    const response = await plaidClient.liabilitiesGet({
      access_token: accessToken,
    });

    // Start a database transaction to ensure atomicity
    const transaction = await sequelize.transaction();

    try {
      const { accounts, liabilities, item } = response.data;
      const { mortgage, student,credit } = liabilities;
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
              unofficialCurrencyCode:
                accountData.balances.unofficial_currency_code,
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
              originationPrincipalAmount:
                mortgageData.origination_principal_amount,
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

      if (credit) {
        for (const creditData of credit) {
          await Credit.upsert(
            {
              accountId: creditData.account_id,
              aprs: creditData.aprs,
              isOverdue: creditData.is_overdue,
              lastPaymentAmount: creditData.last_payment_amount,
              lastPaymentDate: creditData.last_payment_date,
              lastStatementBalance: creditData.last_statement_balance,
              lastStatementIssueDate: creditData.last_statement_issue_date,
              minimumPaymentAmount: creditData.minimum_payment_amount,
              nextPaymentDueDate: creditData.next_payment_due_date,
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
              originationPrincipalAmount:
                studentData.origination_principal_amount,
              outstandingInterestAmount:
                studentData.outstanding_interest_amount,
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
        message: "Liabilities data successfully saved",
        data: response?.data,
      };
      res.json(data);
    } catch (error) {
      // Rollback the transaction if something goes wrong
      await transaction.rollback();
      console.error(
        "Error saving data to the database:",
        error.message || error
      );
      res
        .status(500)
        .json({
          error: "Error saving data to the database",
          details: error.message || error,
        });
    }
  } catch (error) {
    console.error(
      "Error fetching liabilities from Plaid:",
      error.response ? error.response.data : error.message
    );
    res
      .status(500)
      .json({
        error: "An error occurred fetching liabilities",
        details: error.response ? error.response.data : error.message,
      });
  }
};

// Controller function to handle the risk score request
const getRiskScoreController = async (req, res) => {
  try {
    const { accessTokens } = req.body; // Array of access tokens from the request body
    if (!Array.isArray(accessTokens) || accessTokens.length === 0) {
      return res
        .status(400)
        .json({
          success: false,
          message: "Access tokens are required and must be an array",
        });
    }
    const token = req.headers.authorization?.split(" ")[1];
    if (!token) {
      return res
        .status(401)
        .json({ success: false, message: "No token provided" });
    }

    const results = [];

    for (const accessToken of accessTokens) {
      try {
        // Fetch liabilities data from Plaid API
        const response = await plaidClient.liabilitiesGet({
          access_token: accessToken,
        });

        const liabilitiesData = {
          credit: response?.data?.liabilities?.credit || [],
          student: response?.data?.liabilities?.student || [],
          mortgage: response?.data?.liabilities?.mortgage || [],
          accounts: response?.data?.accounts || [],
        };

        console.log("liabilitiesData-------------",liabilitiesData);
        

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
        console.error(
          `Error fetching liabilities or calculating risk for token ${accessToken}:`,
          error
        );
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
    res
      .status(500)
      .json({ message: "Error processing risk score calculations", error });
  }
};

const getBankAccountData = async (req, res) => {
  const userId = 256; // Example userId

  try {
    // Step 1: Fetch all account IDs from Account table
    const accountRecords = await Account.findAll({
      where: { userId },
      attributes: ["accountId"], // Get only accountId
    });

    // Step 2: Fetch all account IDs from other tables where userId is present
    const creditRecords = await Credit.findAll({
      where: { userId },
      attributes: ["accountId"],
    });

    const mortgageRecords = await Mortgage.findAll({
      where: { userId },
      attributes: ["accountId"],
    });

    const studentLoanRecords = await StudentLoan.findAll({
      where: { userId },
      attributes: ["accountId"],
    });

    // Step 3: Collect all account IDs and remove duplicates
    const accountIds = [
      ...new Set([
        ...accountRecords.map((a) => a.accountId),
        ...creditRecords.map((c) => c.accountId),
        ...mortgageRecords.map((m) => m.accountId),
        ...studentLoanRecords.map((s) => s.accountId),
      ]),
    ];

    if (accountIds.length === 0) {
      return res.status(404).json({ message: "No accounts found for user" });
    }

    console.log("User's Account IDs:", accountIds);

    // Step 4: Fetch all related data using these accountIds
    const accountData = await Account.findAll({
      where: { accountId: { [Op.in]: accountIds } }, // Fetch data for multiple accountIds
      include: [
        { model: Balances, required: false },
        { model: Credit, required: false },
        { model: Mortgage, required: false },
        { model: StudentLoan, required: false },
      ],
    });

    if (!accountData || accountData.length === 0) {
      return res.status(404).json({ message: "No financial data found for accounts" });
    }

    // Step 5: Structure the data for risk calculation
    const data = accountData.map((account) => ({
      accountId: account.accountId,
      credit: account.Credit
        ? [
            {
              is_overdue: account.Credit.isOverdue,
              aprs: Array.isArray(account.Credit.aprs)
                ? account.Credit.aprs.map((apr) => ({
                    balance_subject_to_apr: apr.balance_subject_to_apr,
                    apr_percentage: apr.apr_percentage,
                  }))
                : [],
              next_payment_due_date: account.Credit.nextPaymentDueDate,
            },
          ]
        : [],
      student: account.StudentLoan
        ? [
            {
              is_overdue: account.StudentLoan.isOverdue,
              outstanding_interest_amount: account.StudentLoan.outstandingInterestAmount,
              pslf_status: account.StudentLoan.pslfStatus
                ? account.StudentLoan.pslfStatus.payments_remaining
                : 0,
            },
          ]
        : [],
      mortgage: account.Mortgage
        ? [
            {
              past_due_amount: account.Mortgage.pastDueAmount,
              current_late_fee: account.Mortgage.currentLateFee,
              has_pmi: account.Mortgage.hasPmi,
            },
          ]
        : [],
      accounts: account.Balance
        ? [
            {
              available: account.Balance.available,
            },
          ]
        : [],
    }));

    return res.status(200).json({
      data,
      message: "Bank data fetched successfully",
    });
  } catch (error) {
    console.error("Error fetching data:", error);
    return res.status(500).json({ message: "Internal Server Error" });
  }
};


const clearOldSessions = async (userId) => {
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
      return res.status(400).json({ message: "Missing userId" });
    }

    console.log(`Requesting IDV link token for userId: ${userId}`);

    // Generate the Plaid link token without the invalid `prefill` field
    const tokenResponse = await plaidClient.linkTokenCreate({
      user: { client_user_id: userId },
      client_name: "Cashfluence",
      products: ["identity_verification"],
      identity_verification: {
        template_id: TEMPLATE_ID, // Use the template ID
      },
      country_codes: ["US"],
      language: "en",
    });

    console.log("Generated Plaid link token:", tokenResponse.data.link_token);

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
      user.address?.street || "",
      user.address?.street2 || "",
      user.address?.city || "",
      user.address?.region || "",
      user.address?.postal_code || "",
      user.address?.country || "",
    ]
      .filter(Boolean)
      .join(", ");

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
    const documentaryVerificationDetails =
      documentary_verification?.documents.map((doc) => ({
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

    console.log(
      "documentaryVerificationDetails",
      documentaryVerificationDetails
    );
    console.log("riskCheckDetails", riskCheckDetails);
    console.log("selfieCheckDetails", selfieCheckDetails);

    // Check if user exists in the database
    const userExists = await PlaidUser.findOne({ where: { user_id: userId } });

    if (!userExists) {
      console.error(
        `User with user_id ${userId} does not exist. Creating a new record.`
      );

      // Create a new record
      const newUser = await PlaidUser.create({
        user_id: userId,
        first_name: user.name?.given_name || "Unknown",
        last_name: user.name?.family_name || "Unknown",
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
        first_name: user.name?.given_name || "Unknown",
        last_name: user.name?.family_name || "Unknown",
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
    return { created: false, updated: updateStatus[0] > 0, status };
  } catch (error) {
    console.error("Error updating user record for IDV session:", error);
    throw new Error("Failed to update user record");
  }
};

const plaidIDVComplete = async (req, res, next) => {
  try {
    const { metadata, userId } = req.body;

    if (!metadata?.link_session_id) {
      return res.status(400).json({ message: "Missing IDV session ID" });
    }

    // Update user record with the IDV session data
    const sessionStatus = await updateUserRecordForIDVSession(
      metadata.link_session_id,
      userId
    );

    // Handle user creation and update cases
    if (sessionStatus?.created && sessionStatus?.status === "success") {
      console.log(`New user created with userId: ${userId}`);
      return res.json({ message: "User created successfully." });
    }
    if (sessionStatus?.status == "failed") {
      return res.status(500).json({ message: "Verification failed." });
    }

    if (sessionStatus?.updated) {
      console.log(`User ${userId} record updated successfully.`);

      // Check if the user still needs to complete verification
      const user = await PlaidUser.findOne({ where: { user_id: userId } });

      if (user.plaid_idv_status !== "success") {
        return res.json({ message: "Verification is incomplete." });
      } else if (user.plaid_idv_status === "failed") {
        // IDV failed, return 500 error
        return res.status(500).json({ message: "Verification failed." });
      } else {
        return res.json({ message: "User already verified." });
      }
    }

    // If no rows were updated and no user was created
    return res.status(500).json({ message: "Internal server error" });
  } catch (error) {
    console.error("Error in Plaid IDV complete:", error);
    next(error); // Forward to error handling middleware
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

const getPlaidUserState = async (req, res) => {
  try {
    // Extract user_id from request query or body
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ message: "user_id is required" });
    }

    // Fetch the user record
    const plaidUser = await PlaidUser.findOne({
      where: { user_id },
    });

    if (!plaidUser) {
      return res.status(200).json({
        message:
          "Plaid User not found. Please complete identity verification and KYC on the profile page.",
      });
    }

    // Extract the address from the user's data
    const { address } = plaidUser;

    if (!address) {
      return res.status(200).json({
        message:
          "Address not found for the user. Please complete your profile.",
      });
    }

    // Parse the address to extract the state
    const addressParts = address.split(",").map((part) => part.trim());

    // Ensure the address has enough parts to contain a state
    if (addressParts.length >= 4) {
      // The state is typically the third-to-last part in the address
      const state = addressParts[addressParts.length - 3]; // The part that should contain the state

      // If the state is a two-letter abbreviation, return it
      if (state && state.length === 2) {
        return res.status(200).json({
          message: "State retrieved successfully",
          state,
        });
      } else {
        return res.status(200).json({
          message:
            "State not found or invalid format. Please verify your address.",
        });
      }
    } else {
      return res.status(200).json({
        message: "Invalid address format. Please verify your address.",
      });
    }
  } catch (error) {
    console.error("Error fetching Plaid user data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

const PlaidResetIdv = async (req, res) => {
  const { client_user_id } = req.body;

  try {
    if (!client_user_id) {
      return res.status(400).json({ message: "Missing client_user_id" });
    }

    console.log("Retrying IDV for client_user_id:", client_user_id);

    const request = {
      client_user_id: client_user_id,
      template_id: TEMPLATE_ID,
      strategy: "reset",
    };

    const response = await plaidClient.identityVerificationRetry(request);

    console.log("Retry Response:", response.data);

    res.json({
      message: "Identity verification retry initiated successfully",
      data: response.data,
    });
  } catch (error) {
    console.error(
      "Error retrying identity verification:",
      error.response?.data || error.message
    );
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
    console.log("plaiduser....", plaidUser);

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

const getUserDataFromDatabase = async (user_id) => {
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
    return userData;
  } catch (error) {
    console.error("Error fetching user data:", error);
    return res.status(500).json({ message: "Internal server error" });
  }
};

//prefill_idv_data
const prefillUserData = async (req, res, next) => {
  const { userId } = req.body;
  try {
    const getUserData = await getUserDataFromDatabase(userId); // Fetch user data from your databas
    const response = await plaidClient.identityVerificationCreate({
      is_shareable: false,
      template_id: TEMPLATE_ID,
      is_idempotent: true,
      user: {
        client_user_id: userId,
        name: {
          family_name: getUserData.firstName,
          given_name: getUserData.lastName,
        },
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
    console.log(response.data);
    const updatedData = await updateLatestIDVSession(userId, idvSession);
    return updatedData;
  } catch (error) {
    next(error);
  }
};

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
      return "Plaid User not found or no changes made";
    }

    // Respond with success
    return result;
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
    return res
      .status(400)
      .json({ error: "Access token, start date, and end date are required" });
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
        "accountId",
        "mask",
        "name",
        "officialName",
        "persistentAccountId",
        "subtype",
        "type",
        "institution_name",
        "institution_id",
        "accessToken",
      ],
    });

    if (!accounts.length) {
      return res
        .status(404)
        .json({ message: "No accounts found for the given user." });
    }

    // Collect account data with related information (balances, mortgages, loans)
    const accountData = await Promise.all(
      accounts.map(async (account) => {
        const accountId = account.accountId;

        // Fetch related data for each account
        const balances = await Balances.findOne({
          where: { accountId, userId },
          attributes: [
            "available",
            "current",
            "isoCurrencyCode",
            "limit",
            "unofficialCurrencyCode",
          ],
        });

        const mortgage = await Mortgage.findOne({
          where: { accountId, userId },
          attributes: [
            "accountNumber",
            "interestRatePercentage",
            "nextPaymentDueDate",
            "loanTypeDescription",
          ],
        });

        const studentLoan = await StudentLoan.findOne({
          where: { accountId, userId },
          attributes: [
            "loanName",
            "minimumPaymentAmount",
            "nextPaymentDueDate",
            "outstandingInterestAmount",
          ],
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
          accessToken: account.accessToken,
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
          accessToken: account.accessToken,
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
    console.error("Error fetching user data:", error);
    return res
      .status(500)
      .json({ message: "Failed to fetch user data.", error: error.message });
  }
};

const getAverageBalance = async (req, res) => {
  const { accessToken, startDate, endDate } = req.body;

  if (!accessToken || !startDate || !endDate) {
    return res
      .status(400)
      .json({ error: "Access token, start date, and end date are required" });
  }

  try {
    
    const response = await plaidClient.transactionsGet({
      access_token: accessToken,
      start_date: startDate,
      end_date: endDate,
    });

    const { accounts, transactions } = response.data;

    if (!accounts.length) {
      return res.status(400).json({ error: "No accounts found" });
    }

    // Current Balance
    const currentBalance = accounts[0].balances.current;

    // Transactions Total
    let totalTransactionAmount = transactions.reduce((sum, txn) => sum + txn.amount, 0);
    
    // Total Transactions Count
    let totalTransactions = transactions.length;

    // Average Balance Calculation
    let averageBalance = (currentBalance + totalTransactionAmount) / (totalTransactions + 1);

    res.json({ currentBalance, averageBalance: averageBalance.toFixed(2) });

  } catch (error) {
    console.error("Error fetching transactions:", error.response ? error.response.data : error);
    res.status(500).json({ error: "An error occurred fetching transactions" });
  }
};

const deleteBankDetails = async (req, res) => {
  const { userId, institutionId } = req.body;

  if (!userId || !institutionId) {
    return res.status(400).json({ error: "Missing userId or institutionId" });
  }

  try {
    // 🔍 Debug: Find accounts before deletion
    const accounts = await Account.findAll({ where: { userId, institution_id: institutionId } });
    console.log("Accounts found before deletion:", accounts);

    if (accounts.length === 0) {
      return res.status(404).json({ error: "No accounts found for this institution" });
    }

    // Extract accountIds
    const accountIds = accounts.map(account => account.accountId);

    // 🔥 Delete related records before deleting accounts
    await Balances.destroy({ where: { accountId: accountIds } });
    await Mortgage.destroy({ where: { accountId: accountIds } });
    await StudentLoan.destroy({ where: { accountId: accountIds } });
    await Credit.destroy({ where: { accountId: accountIds } });

    // 🔥 Delete accounts (Ensure Sequelize deletes them properly)
    const deleted = await Account.destroy({ where: { userId, institution_id: institutionId } });

    // 🚨 Check if deletion actually happened
    if (deleted === 0) {
      return res.status(500).json({ error: "Account deletion failed!" });
    }

    console.log("✅ Bank and all associated accounts deleted successfully.");
    return res.status(200).json({ message: "Bank and all associated accounts deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting bank details:", error);
    return res.status(500).json({ error: "Server error" });
  }
};

const deleteAccountDetails = async (req, res) => {
  const { userId, accountId } = req.body;

  if (!userId || !accountId) {
    return res.status(400).json({ error: "Missing userId or accountId" });
  }

  try {
    // 🔍 Debug: Check if account exists before deleting
    const account = await Account.findOne({ where: { accountId, userId } });

    if (!account) {
      return res.status(404).json({ error: "Account not found or unauthorized" });
    }

    // 🔥 Delete related records first
    await Balances.destroy({ where: { accountId } });
    await Mortgage.destroy({ where: { accountId } });
    await StudentLoan.destroy({ where: { accountId } });
    await Credit.destroy({ where: { accountId } });

    // 🔥 Delete the main account
    const deleted = await Account.destroy({ where: { accountId, userId } });

    // 🚨 Check if deletion happened
    if (deleted === 0) {
      return res.status(500).json({ error: "Account deletion failed!" });
    }

    console.log("✅ Account deleted successfully.");
    return res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    console.error("❌ Error deleting account:", error);
    return res.status(500).json({ error: "Server error" });
  }
};


// const deleteAccountDetails = async (req, res) => {
//   const { userId, accountId } = req.body;

//   if (!userId || !accountId) {
//     return res.status(400).json({ error: "Missing userId or accountId" });
//   }

//   try {
//     const account = await Account.findOne({ where: { accountId, userId } });

//     if (!account) {
//       return res.status(404).json({ error: "Account not found or unauthorized" });
//     }

//     // Delete related records first
//     await Balances.destroy({ where: { accountId } });
//     await Mortgage.destroy({ where: { accountId } });
//     await StudentLoan.destroy({ where: { accountId } });
//     await Credit.destroy({ where: { accountId } });

//     // Now delete the main account
//     await Account.destroy({ where: { accountId, userId } });

//     return res.status(200).json({ message: "Account deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting account:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// };

// const deleteBankDetails = async (req, res) => {
//   const { userId, institutionId } = req.body;

//   if (!userId || !institutionId) {
//     return res.status(400).json({ error: "Missing userId or institutionId" });
//   }

//   try {
//     // Find all accounts linked to the user and institution
//     const accounts = await Account.findAll({ where: { userId, institution_id: institutionId } });

//     if (accounts.length === 0) {
//       return res.status(404).json({ error: "No accounts found for this institution" });
//     }

//     // Extract accountIds
//     const accountIds = accounts.map(account => account.accountId);

//     // Delete related records first
//     await Balances.destroy({ where: { accountId: accountIds } });
//     await Mortgage.destroy({ where: { accountId: accountIds } });
//     await StudentLoan.destroy({ where: { accountId: accountIds } });
//     await Credit.destroy({ where: { accountId: accountIds } });

//     // Now delete all accounts related to this institution
//     await Account.destroy({ where: { userId, institution_id: institutionId } });

//     return res.status(200).json({ message: "Bank and all associated accounts deleted successfully" });
//   } catch (error) {
//     console.error("Error deleting bank details:", error);
//     return res.status(500).json({ error: "Server error" });
//   }
// };


module.exports = {
  createLinkToken,
  plaidPublicToken,
  getLiabilities,
  getpliadUserIdvStauts,
  getTransactions,
  getUserAccountData,
  getRiskScoreController,
  idvPlaidToken,
  plaidIDVComplete,
  clearOldSessions,
  getPlaidUserData,
  PlaidResetIdv,
  prefillUserData,
  getPlaidUserState,
  getBankAccountData,
  getAverageBalance,
  deleteAccountDetails,
  deleteBankDetails
};
