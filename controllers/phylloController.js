// tokenController.js
const axios = require("axios");
const messages = require("../constants/Messages");
const InterestRateTable = require("../models/InterestRateTable");
const InterestRateStateData = require("../models/InterestRateStateData");
// controllers/riskController.js

const PHYLLO_BASE_URL = process.env.PHYLLO_BASE_URL;
const SANDBOX_TOKEN = process.env.SANDBOX_TOKEN;
const AUTH_TOKEN = `Basic ${SANDBOX_TOKEN}`;
const { Sequelize } = require('../config/db'); 

const createPhylloUser = async (req, res) => {
  try {
    // Check if the user exists in the database
    const { external_id,login_id } = req.body; // Assuming `external_id` is passed in the request body
   
    const existingUser = await InterestRateTable.findOne({
      where: { external_id },
    });

    if (existingUser) {
      // User already exists
      return res.json({
        success: true,
        message: messages?.UserExist,
        userData: existingUser,
      });
    } // If user does not exist, create a new one

    const payload = {
      name: messages?.NAME,
      external_id: external_id || messages?.NAME + Date.now(), // Generate unique ID if not provided
    };

   const response = await axios.post(`${PHYLLO_BASE_URL}/users`, payload, {
      headers: {
        "Content-Type": "application/json",
        Authorization: AUTH_TOKEN,
      },
    });

    const userId = response.data?.id;
    
    const externalId = response.data?.external_id;
    const name = response.data?.name;

    const resData = {
      userid:login_id,
      user_id: userId,
      external_id: externalId,
      name: name,
    };

    // Save user details to the User table and InterestRateTable
    // await userTable.create(resData);
    await InterestRateTable.create(resData);

    return res.json({ success: true, userData: resData });
  } catch (error) {
    console.error(messages?.ERROR, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error?.message || messages?.ERROR,
    });
  }
};

const createPhylloSDKToken = async (req, res) => {
  try {
    let savedUserId;

    if (!savedUserId) {
      const userRecord = await InterestRateTable.findOne({
        where: { user_id: req.body.user_id },
      });

      if (!userRecord) {
        return res.status(404).json({ error: messages?.USER_CREATE_ERROR });
      }

      savedUserId = userRecord.user_id;
    }
    const payload = {
      user_id: savedUserId,
      products: [
        "IDENTITY",
        "IDENTITY.AUDIENCE",
        "ENGAGEMENT",
        "ENGAGEMENT.AUDIENCE",
        "INCOME",
        "PUBLISH.CONTENT",
        "ACTIVITY",
      ],
    };

    const response = await axios.post(
      `${PHYLLO_BASE_URL}/sdk-tokens`,
      payload,
      {
        headers: {
          "Content-Type": "application/json",
          Authorization: AUTH_TOKEN,
        },
      }
    );

    res.status(response.status).json(response.data);
  } catch (error) {
    console.error(messages?.TOKEN_ERROR, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.response?.data || messages?.TOKEN_ERROR,
    });
  }
};
const calculateAveragesAndQuality = (contentData, platform) => {
  const data = contentData.data;

  // Initialize accumulators and counters for platform-specific fields
  const totals = {
    like_count: 0,
    dislike_count: 0,
    comment_count: 0,
    impression_organic_count: 0,
    reach_organic_count: 0,
    save_count: 0,
    view_count: 0,
    replay_count: 0,
    watch_time_in_hours: 0,
    share_count: 0,
    unsubscribe_count: 0,
    spam_report_count: 0,
  };

  const counts = {
    like_count: 0,
    dislike_count: 0,
    comment_count: 0,
    impression_organic_count: 0,
    reach_organic_count: 0,
    save_count: 0,
    view_count: 0,
    replay_count: 0,
    watch_time_in_hours: 0,
    share_count: 0,
    unsubscribe_count: 0,
    spam_report_count: 0,
  };

  // Loop through the data to calculate sums and counts, platform-specific
  data?.forEach((item) => {
    if (item.work_platform?.name === platform) { // Compare with work_platform.name
      Object.keys(totals).forEach((field) => {
        if (item.engagement[field] !== null) {
          totals[field] += item.engagement[field];
          counts[field]++;
        }
      });
    }
  });

  // Calculate averages
  const averages = {};
  Object.keys(totals).forEach((field) => {
    averages[`avg_${field}`] =
      counts[field] > 0 ? totals[field] / counts[field] : 0;
  });

  // Define weights for each metric (same for all platforms)
  const weights = {
    like_count: 0.25, // Likes have 25% weight
    comment_count: 0.2, // Comments have 20% weight
    share_count: 0.2, // Shares have 20% weight
    save_count: 0.15, // Saves have 15% weight
    impression_organic_count: 0.1, // Impressions have 10% weight
    reach_organic_count: 0.1, // Reach has 10% weight
  };

  // Calculate content quality score as a weighted sum of the averages
  const qualityScore =
    averages.avg_like_count * weights.like_count +
    averages.avg_comment_count * weights.comment_count +
    averages.avg_share_count * weights.share_count +
    averages.avg_save_count * weights.save_count +
    averages.avg_impression_organic_count * weights.impression_organic_count +
    averages.avg_reach_organic_count * weights.reach_organic_count;

  // Return both averages and the content quality score for the selected platform
  return {
    platform: platform,
    averages,
    contentQualityScore: qualityScore,
  };
};


const fetchPhylloPlatforms = async (req, res) => {
  const userId = req.query.user_id;
  try {
    let savedUserId;

    if (!savedUserId) {
      const userRecord = await InterestRateTable.findOne({
        where: { user_id: userId },
      });

      if (!userRecord) {
        return res.status(404).json({ error: messages?.USER_CREATE_ERROR });
      }

      savedUserId = userRecord.user_id; // Retrieve user ID from the database
    }

    // Fetch platforms from the Phyllo API
    const response = await axios.get(`${PHYLLO_BASE_URL}/work-platforms`, {
      auth: {
        username: process.env.PHYLLO_API_USERNAME,
        password: process.env.PHYLLO_API_PASSWORD,
      },
      headers: {
        Authorization: AUTH_TOKEN,
      },
    });

    const platforms = response.data;

    // Map platform data
    const platformData = platforms?.data.map((platform) => {
      const { id, name, products } = platform;

      // Extract product info for each platform
      const productInfo = {
        identity: products?.identity?.is_supported,
        engagement: products?.engagement?.is_supported,
        audience: products?.identity?.audience?.is_supported,
        activity: products?.activity?.is_supported,
        income: products?.income?.is_supported,
        switch: products?.switch?.is_supported,
        publish: products?.publish?.is_supported,
      };

      return {
        id,
        name,
        products: productInfo,
      };
    });
// Filter the platforms array to include only those in the platformsToInclude list
    const platformsToInclude = [ "Instagram", "YouTube","TikTok"];
    const filteredPlatforms = platformData.filter((platform) =>
      platformsToInclude.includes(platform.name)
    );
    // Update user record in the database with platform data
    await InterestRateTable.update(
      {
        platforms: filteredPlatforms, // Save platform data as JSON
        updated_at: new Date(), // Update timestamp
      },
      {
        where: { user_id: savedUserId }, // Find user by user_id
      }
    );

    // Send response with success
    res.json({ success: true, platforms: filteredPlatforms });
  } catch (error) {
    console.error(messages?.ERROR_FETCHING_PLATFORMS, error);
    return res.status(500).json({
      success: false,
      message: messages?.ERROR_FETCHING_PLATFORMS,
      error: error.message,
    });
  }
};



const fetchanSocialAccount = async (req, res) => {
  try {
    const { work_platform_id, user_id, limit, platformName } = req?.query;  // Make sure platformName is sent from the frontend

    // Fetch accounts and profiles data
    const [accountsResponse, profilesResponse] = await Promise.all([
      axios.get(`${PHYLLO_BASE_URL}/accounts`, {
        params: { work_platform_id, user_id, limit, offset: 0 },
        auth: {
          username: process.env.PHYLLO_API_USERNAME,
          password: process.env.PHYLLO_API_PASSWORD,
        },
        headers: { Authorization: AUTH_TOKEN },
      }),
      axios.get(`${PHYLLO_BASE_URL}/profiles`, {
        params: { work_platform_id, user_id, limit, offset: 0 },
        auth: {
          username: process.env.PHYLLO_API_USERNAME,
          password: process.env.PHYLLO_API_PASSWORD,
        },
        headers: { Authorization: AUTH_TOKEN },
      }),
    ]);

    const account = accountsResponse.data.data[0];
    const matchedProfile = profilesResponse.data.data[0];
 const platformFields = {
      Instagram: { fields: ["follower_count", "following_count"] },
      YouTube: {
        fields: ["watch_time_in_hours", "average_open_rate"],
        extra: { is_verified: matchedProfile.is_verified },
      },
      TikTok: {
        fields: ["follower_count", "following_count", "watch_time_in_hours", "average_open_rate"],
        extra: { is_verified: matchedProfile.is_verified },
      },
    };

    let accountDetails = {
      username: matchedProfile.username,
      subscriber_count: matchedProfile.reputation.subscriber_count,
      paid_subscriber_count: matchedProfile.reputation.paid_subscriber_count,
      content_count: matchedProfile.reputation.content_count,
      like_count: matchedProfile.reputation.like_count,
      is_business: matchedProfile.is_business,
      platform_profile_name: matchedProfile.platform_profile_name,
      connection_count: matchedProfile.connection_count,
      work_experiences: matchedProfile.work_experiences,
      ...(platformFields[platformName]?.fields || []).reduce((acc, field) => {
        acc[field] = matchedProfile.reputation[field];
        return acc;
      }, {}),
      ...platformFields[platformName]?.extra,
    };

    // Fetch demographics data
    // const demographicsResponse = await axios.get(`${PHYLLO_BASE_URL}/audience`, {
    //   params: { account_id: account.id },
    //   auth: {
    //     username: process.env.PHYLLO_API_USERNAME,
    //     password: process.env.PHYLLO_API_PASSWORD,
    //   },
    //   headers: { Authorization: AUTH_TOKEN },
    // });

    const contentResponse = await axios.get(`${PHYLLO_BASE_URL}/social/contents`, {
      params: {
        account_id: account.id,
        user_id,
        from_date: "2021-01-01",
        to_date: new Date().toISOString().split("T")[0],
        limit,
        offset: 0,
      },
      auth: {
        username: process.env.PHYLLO_API_USERNAME,
        password: process.env.PHYLLO_API_PASSWORD,
      },
      headers: { Authorization: AUTH_TOKEN },
    });

    if (contentResponse?.data?.data?.length > 0) {
      contentResponse?.data?.data?.forEach((item) => {
        const platform = item?.work_platform?.name;
        const result = calculateAveragesAndQuality(contentResponse?.data, platform);
   if (platform === "TikTok") {
          accountDetails = {
            ...accountDetails,
            average_like_count: result?.averages?.avg_like_count,
            average_dislike_count: result?.averages?.avg_dislike_count,
            average_comment_count: result?.averages?.avg_comment_count,
            average_impression_organic_count: result?.averages?.avg_impression_organic_count,
            average_reach_organic_count: result?.averages?.avg_reach_organic_count,
            average_save_count: result?.averages?.avg_save_count,
            average_view_count: result?.averages?.avg_view_count,
            average_replay_count: result?.averages?.avg_replay_count,
            average_watch_time_in_hour: result?.averages?.avg_watch_time_in_hour,
            average_share_count: result?.averages?.avg_share_count,
            average_unsubscribe_count: result?.averages?.avg_unsubscribe_count,
            average_spam_report_count: result?.averages?.avg_spam_report_count,
            average_content_quality_score: result.contentQualityScore,
          };
        } else if (platform === "Instagram") {
          accountDetails = {
            ...accountDetails,
            average_like_count: result?.averages?.avg_like_count,
            average_dislike_count: result?.averages?.avg_dislike_count,
            average_comment_count: result?.averages?.avg_comment_count,
            average_impression_organic_count: result?.averages?.avg_impression_organic_count,
            average_reach_organic_count: result?.averages?.avg_reach_organic_count,
            average_save_count: result?.averages?.avg_save_count,
            average_view_count: result?.averages?.avg_view_count,
            average_replay_count: result?.averages?.avg_replay_count,
            average_watch_time_in_hour: result?.averages?.avg_watch_time_in_hour,
            average_share_count: result?.averages?.avg_share_count,
            average_unsubscribe_count: result?.averages?.avg_unsubscribe_count,
            average_spam_report_count: result?.averages?.avg_spam_report_count,
            average_content_quality_score: result.contentQualityScore,
          };
        } else if (platform === "YouTube") {
          accountDetails = {
            ...accountDetails,
            average_like_count: result?.averages?.avg_like_count,
            average_dislike_count: result?.averages?.avg_dislike_count,
            average_comment_count: result?.averages?.avg_comment_count,
            average_impression_organic_count: result?.averages?.avg_impression_organic_count,
            average_reach_organic_count: result?.averages?.avg_reach_organic_count,
            average_save_count: result?.averages?.avg_save_count,
            average_view_count: result?.averages?.avg_view_count,
            average_replay_count: result?.averages?.avg_replay_count,
            average_watch_time_in_hour: result?.averages?.avg_watch_time_in_hour,
            average_share_count: result?.averages?.avg_share_count,
            average_unsubscribe_count: result?.averages?.avg_unsubscribe_count,
            average_spam_report_count: result?.averages?.avg_spam_report_count,
            average_content_quality_score: result.contentQualityScore,
          };
        }
      });
    } else {
      console.log("No data available to calculate averages.");
    }

    // Fetch income data
    const incomeResponse = await axios.get(`${PHYLLO_BASE_URL}/social/income/payouts`, {
      params: {
        user_id,
        account_id: account.id,
        payout_from_date: "2021-01-01",
        payout_to_date: new Date().toISOString().split("T")[0],
        limit,
        offset: 0,
      },
      auth: {
        username: process.env.PHYLLO_API_USERNAME,
        password: process.env.PHYLLO_API_PASSWORD,
      },
      headers: { Authorization: AUTH_TOKEN },
    });
    const income = {
      "data": [
        {
          "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
          "created_at": "2020-03-27T12:56:34.534978",
          "updated_at": "2020-03-27T12:56:34.534978",
          "user": {
            "id": "fb83e3ca-eae7-4eaa-bf51-601ea4b3daeb",
            "name": "John Doe"
          },
          "account": {
            "id": "fb83e3ca-eae7-4eaa-bf51-601ea4b3daeb",
            "platform_username": "john.doe@gmail.com"
          },
          "work_platform": {
            "id": "fb83e3ca-eae7-4eaa-bf51-601ea4b3daeb",
            "name": "Instagram",
            "logo_url": "https://getphyllo.com/storage/instagram.png"
          },
          "amount": 123.45,
          "currency": "USD",
          "status": "SCHEDULED",
          "payout_interval": "AUTOMATIC_DAILY",
          "bank_details": {
            "name": "string",
            "account_last_digits": "string",
            "account_routing_number": "string"
          },
          "external_id": "5790fbc3-b022-437b-abf8-0492c7a82056",
          "payout_at": "2020-03-27T12:56:34.534978",
          "platform_profile_id": "UCEyLTzBtHJhlUwkeWhxfMXw",
          "platform_profile_name": "Peter Parker"
        }
      ],
      "metadata": [
        {
          "offset": 0,
          "limit": 10,
          "from_date": "2020-12-31",
          "to_date": "2021-12-31"
        }
      ]
    };

    const incomeData = income.data[0]; 

    // Check if income data exists
    if (income?.data?.length > 0) {
      const platform = incomeData?.work_platform?.name; // Platform name from income data
      const queryPlatform = platformName; // Platform name from query params
    
      // Ensure that the platform in the query matches the platform in the income data
      if (platform === queryPlatform) {
        // Check platform and add the income details accordingly
      
          accountDetails = {
            ...accountDetails,
              income_amount: incomeData?.amount,
              income_currency: incomeData?.currency,
              income_status: incomeData?.status,
              income_type: incomeData?.type,
              income_payout_interval: incomeData?.payout_interval,
          }
      }
    }
    

    // Update database with demographics for all supported platforms
    const existingAccount = await InterestRateTable.findOne({
      where: { user_id },
    });

    const updatedAccountInfo = {
      user_id,
      instagram_data:
        platformName === "Instagram"
          ? accountDetails
          : existingAccount?.instagram_data,
      youtube_data:
        platformName === "YouTube"
          ? accountDetails
          : existingAccount?.youtube_data,
      tiktok_data:
        platformName === "TikTok"
          ? accountDetails
          : existingAccount?.tiktok_data,
      // Add other platforms' columns here as needed
    };

    await existingAccount.update(updatedAccountInfo);

    return res.status(200).json({ message: "Account data updated successfully!" });
  } catch (error) {
    console.error("Error updating account data:", error);
    return res.status(500).json({ error: "Failed to update account data" });
  }
};


const fetchDataFromdatabase = async (req, res) => {
  try {
    const { userId } = req.query;

    // Check if required parameters are provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: messages?.REQUIRED_USER, // Ensure `messages?.REQUIRED_USER` is defined
      });
    }

    // Fetch the account data for the given userId
    const accountData = await InterestRateTable.findOne({
      where: { user_id: userId },
    });

    // Check if no account data was found for the user
    if (!accountData) {
      return res.status(200).json({
        success: false,
        message: `${messages?.ACCOUNT_DATA_ERROR}`,
      });
    } else {
      // If account data is found, return it in the response
      return res.status(200).json({
        success: true,
        accountData, // Send the account data as part of the response
        message: `${messages?.ACCOUNT_DATA}`,
      });
    }
  } catch (error) {
    console.error(messages?.SOCIAL_ACCOUNT_ERROR, error);
    return res.status(500).json({
      success: false,
      message: messages?.ERROR_SOCIAL_ACCOUNTS,
      error: error.message,
    });
  }
};



const fetchDataFromdatabaseAdmin = async (req, res) => {
  try {
    const { userId } = req.query;

    // Check if required parameters are provided
    if (!userId) {
      return res.status(400).json({
        success: false,
        message: messages?.REQUIRED_USER, // Ensure `messages?.REQUIRED_USER` is defined
      });
    }

    // Fetch the account data for the given userId
    const accountData = await InterestRateTable.findOne({
      where: { userid: userId },
    });

    // Check if no account data was found for the user
    if (!accountData) {
      return res.status(200).json({
        success: false,
        message: `${messages?.ACCOUNT_DATA_ERROR}`,
      });
    } else {
      // If account data is found, return it in the response
      return res.status(200).json({
        success: true,
        accountData, // Send the account data as part of the response
        message: `${messages?.ACCOUNT_DATA}`,
      });
    }
  } catch (error) {
    console.error(messages?.SOCIAL_ACCOUNT_ERROR, error);
    return res.status(500).json({
      success: false,
      message: messages?.ERROR_SOCIAL_ACCOUNTS,
      error: error.message,
    });
  }
};



const fetchStateLawFromDatabase = async (req, res) => {
  try {
    const { state, loan_term, loan_amount } = req.query;

    // Validate input parameters
    if (!state || !loan_term || !loan_amount) {
      return res.status(400).json({
        success: false,
        message: "Missing required parameters: state, loan_term, or loan_amount.",
      });
    }

    const loanAmountValue = parseFloat(loan_amount); // Input loan amount as a number
    if (isNaN(loanAmountValue)) {
      return res.status(400).json({
        success: false,
        message: "Invalid loan_amount format. Please provide a numeric value.",
      });
    }

    // Fetch all potential rows for the given state and loan_term
    const allData = await InterestRateStateData.findAll({
      where: {
        state_code : state,
        loan_term,
      },
    });


    if (!allData || allData.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No data found for the given criteria.",
      });
    }

    // Filter rows manually based on loan_amount range
    const filteredData = allData.filter((row) => {
      const rangeMatch = row.loan_amount.match(/(\d+)-(\d+)/); // Extract range (e.g., "600-700")
      if (!rangeMatch) return false;

      const rangeStart = parseFloat(rangeMatch[1]);
      const rangeEnd = parseFloat(rangeMatch[2]);

      // Check if loan_amount falls within the range
      return loanAmountValue >= rangeStart && loanAmountValue <= rangeEnd;
    });
if (filteredData.length === 0) {
      return res.status(200).json({
        success: false,
        message: "No matching data found for the given loan amount.",
      });
    }

    // Return the first matched result (or customize as needed)
    return res.status(200).json({
      success: true,
      value: filteredData[0].value, // Adjust if you want to return multiple matches
      message: "Data retrieved successfully.",
    });
  } catch (error) {
    console.error("Error:", error.message);
    return res.status(500).json({
      success: false,
      message: "Failed to retrieve data.",
      error: error.message,
    });
  }
};





// const fetchDataFromdatabase = async (req, res) => {
//   try {
//     const { userId, platformName } = req.query;

//     if (!userId || !platformName) {
//       return res.status(400).json({
//         success: false,
//         message:messages?.REQUIRED,
//       });
//     }

//     // Fetch the existing account data for the user
//     const existingAccount = await InterestRateTable.findOne({
//       where: { user_id: userId },
//     });

//     if (!existingAccount) {
//       return res.status(200).json({
//         success: true,
//         accountExists: false,
//         message: `${messages?.NO_ACCOUNT} ${platformName}. ${messages?.PROCEED_CONNECT}`,
//       });
//     }

//     // Dynamically check based on the platform name
//     let accountData = null;
//     switch (platformName) {
//       case "Instagram":
//         accountData = existingAccount.instagram_data;
//         break;
//       case "YouTube":
//         accountData = existingAccount.youtube_data;
//         break;
//       case "Facebook":
//         accountData = existingAccount.facebook_data;
//         break;
//       case "X":
//         accountData = existingAccount.twitter_data;
//         break;
//       default:
//         return res.status(400).json({
//           success: false,
//           message: messages?.INVALID_PLATFORM,
//         });
//     }

//     if (accountData) {
//       // Account already exists
//       return res.status(200).json({
//         success: true,
//         accountExists: true,
//         message: `An account for ${platformName} ${messages?.Exist} `,
//         acountdata: existingAccount,
//       });
//     } else {
//       // No account exists for this platform
//       return res.status(200).json({
//         success: true,
//         accountExists: false,
//         message: `${messages?.NO_ACCOUNT} ${platformName} exists. ${messages?.PROCEED_CONNECT}`,
//       });
//     }
//   } catch (error) {
//     console.error(messages?.SOCIAL_ACCOUNT_ERROR, error);
//     return res.status(500).json({
//       success: false,
//       message: messages?.ERROR_SOCIAL_ACCOUNT,
//       error: error.message,
//     });
//   }
// };

const deletePlatformData = async (req, res) => {
  const { userId, platformName } = req.body;

  // Validate incoming data
  if (!userId || !platformName) {
    return res.status(400).json({
      success: false,
      message: messages?.MISSING_BODY,
    });
  }

  // Determine the column name in the database based on the platform
  const platformColumn = `${platformName?.toLowerCase()}_data`;

  try {
    // Find the user by userId
    const InterestRateTableData = await InterestRateTable.findOne({
      where: { user_id: userId },
    });

    if (!InterestRateTableData) {
      return res.status(404).json({
        success: false,
        message: messages?.USER_CREATE_ERROR,
      });
    }

    // Check if the platform data exists for the InterestRateTableData
    if (!InterestRateTableData[platformColumn]) {
      return res.status(404).json({
        success: false,
        message: `${platformName} ${messages?.DATA_NOT_FOUND}`,
      });
    }

    // Set the platform-specific data field to null (delete the data)
    InterestRateTableData[platformColumn] = null;
    await InterestRateTableData.save();

    return res.status(200).json({
      success: true,
      message: `${platformName} ${messages?.DATA_DELETED}`,
    });
  } catch (error) {
    console.error(messages?.PLATFORMDATA_ERROR, error);
    return res.status(500).json({
      success: false,
      message: messages?.PLATFORMDATA_DELETING_ERROR,
    });
  }
};

const getContent = async (req, res) => {
  try {
    // const savedUserId = req.session.savedUserId;
    // if (!savedUserId) {
    //   return res.status(400).json({ error: "User ID not found. Create a user first." });
    // }

    const response = await axios.get(
      "https://api.sandbox.getphyllo.com/v1/social/contents",
      {
        params: {
          account_id: "e98b75a3-6ed1-44f2-9fb0-7a6cccb75994", // accound id we are getting from account api result https://api.sandbox.getphyllo.com/v1/accounts?id=14d9ddf5-51c6-415e-bde6-f8ed36ad7054
          from_date: "2021-01-31",
          to_date: "2024-11-15",
          offset: 0,
          limit: 10,
        },
        auth: {
          username: process.env.PHYLLO_API_USERNAME,
          password: process.env.PHYLLO_API_PASSWORD,
        },
        headers: {
          Authorization:
            "Basic bm9haEB0aGVydWNrdXNsYWJzLmNvbTprZXAzITNSOHBHcTYhWmU=",
        },
      }
    );

    const contentData = response.data;
    //here we are getting al profile if we pass profile id in api like this we will get particular profile
    // https://api.sandbox.getphyllo.com/v1/profiles/{e38916f7-bd4b-40aa-9d04-a56814c5e375}

    const userId = "5cc24c79-3e25-4d64-8da3-a99682d77e25";

    // const platformData = platforms?.data?.map(platform => ({
    //   id: platform.id,
    //   name: platform.name,
    //   userId: userId,
    // }));

    res.json({ success: true, contentData: contentData });
  } catch (error) {
    console.error("Error fetching Phyllo platforms:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch platforms",
      error: error.message,
    });
  }
};





















// const getPublicationContent = async (req, res) => {
//   try {
//     // const savedUserId = req.session.savedUserId;
//     // if (!savedUserId) {
//     //   return res.status(400).json({ error: "User ID not found. Create a user first." });
//     // }

//     const response = await axios.get(
//       "https://api.sandbox.getphyllo.com/v1/social/contents",
//       {
//         params: {
//           account_id: "e98b75a3-6ed1-44f2-9fb0-7a6cccb75994", // accound id we are getting from account api result https://api.sandbox.getphyllo.com/v1/accounts?id=14d9ddf5-51c6-415e-bde6-f8ed36ad7054
//           from_date: "2021-01-31",
//           to_date: "2024-11-15",
//           offset: 0,
//           limit: 10,
//         },
//         auth: {
//           username: process.env.PHYLLO_API_USERNAME,
//           password: process.env.PHYLLO_API_PASSWORD,
//         },
//         headers: {
//           Authorization:
//             "Basic bm9haEB0aGVydWNrdXNsYWJzLmNvbTprZXAzITNSOHBHcTYhWmU=",
//         },
//       }
//     );

//     const contentData = response.data;
//     //here we are getting al profile if we pass profile id in api like this we will get particular profile
//     // https://api.sandbox.getphyllo.com/v1/profiles/{e38916f7-bd4b-40aa-9d04-a56814c5e375}

//     const userId = "5cc24c79-3e25-4d64-8da3-a99682d77e25";

//     // const platformData = platforms?.data?.map(platform => ({
//     //   id: platform.id,
//     //   name: platform.name,
//     //   userId: userId,
//     // }));

//     res.json({ success: true, contentData: contentData });
//   } catch (error) {
//     console.error("Error fetching Phyllo platforms:", error);
//     res
//       .status(500)
//       .json({
//         success: false,
//         message: "Failed to fetch platforms",
//         error: error.message,
//       });
//   }
// };

// const getComments = async (req, res) => {
//   try {
//     // const savedUserId = req.session.savedUserId;
//     // if (!savedUserId) {
//     //   return res.status(400).json({ error: "User ID not found. Create a user first." });
//     // }

//     const response = await axios.get(
//       "https://api.sandbox.getphyllo.com/v1/social/comments",
//       {
//         params: {
//           account_id: "e98b75a3-6ed1-44f2-9fb0-7a6cccb75994", // accound id we are getting from account api result https://api.sandbox.getphyllo.com/v1/accounts?id=14d9ddf5-51c6-415e-bde6-f8ed36ad7054
//           from_date: "2021-01-31",
//           to_date: "2024-11-15",
//           offset: 0,
//           limit: 10,
//           content_id: "a91ccfb5-389b-4e35-b22f-da74a098fa32", // content id we will get from content api prv we integrated
//         },
//         auth: {
//           username: process.env.PHYLLO_API_USERNAME,
//           password: process.env.PHYLLO_API_PASSWORD,
//         },
//         headers: {
//           Authorization:
//             "Basic bm9haEB0aGVydWNrdXNsYWJzLmNvbTprZXAzITNSOHBHcTYhWmU=",
//         },
//       }
//     );

//     const commentsOfparticularContent = response.data;
//     //here we are getting al profile if we pass profile id in api like this we will get particular profile
//     // https://api.sandbox.getphyllo.com/v1/profiles/{e38916f7-bd4b-40aa-9d04-a56814c5e375}

//     const userId = "5cc24c79-3e25-4d64-8da3-a99682d77e25";

//     // const platformData = platforms?.data?.map(platform => ({
//     //   id: platform.id,
//     //   name: platform.name,
//     //   userId: userId,
//     // }));

//     res.json({ success: true, CommentsData: commentsOfparticularContent });
//   } catch (error) {
//     console.error("Error fetching Phyllo platforms:", error);
//     res
//       .status(500)
//       .json({
//         success: false,
//         message: "Failed to fetch platforms",
//         error: error.message,
//       });
//   }
// };

// const getSocialTrasactionOfParticularAccount = async (req, res) => {
//   try {
//     // const savedUserId = req.session.savedUserId;
//     // if (!savedUserId) {
//     //   return res.status(400).json({ error: "User ID not found. Create a user first." });
//     // }

//     const response = await axios.get(
//       "https://api.sandbox.getphyllo.com/v1/social/income/transactions",
//       {
//         params: {
//           account_id: "e98b75a3-6ed1-44f2-9fb0-7a6cccb75994", // accound id we are getting from account api result https://api.sandbox.getphyllo.com/v1/accounts?id=14d9ddf5-51c6-415e-bde6-f8ed36ad7054
//           transaction_from_date: "2021-01-31",
//           transaction_to_date: "2024-11-15",
//           offset: 0,
//           limit: 10,
//           type: "", //type of transaction from social platforms
//         },
//         auth: {
//           username: process.env.PHYLLO_API_USERNAME,
//           password: process.env.PHYLLO_API_PASSWORD,
//         },
//         headers: {
//           Authorization:
//             "Basic bm9haEB0aGVydWNrdXNsYWJzLmNvbTprZXAzITNSOHBHcTYhWmU=",
//         },
//       }
//     );

//     const getSocialTrasactionData = response.data;
//     //here we are getting al profile if we pass profile id in api like this we will get particular profile
//     // https://api.sandbox.getphyllo.com/v1/profiles/{e38916f7-bd4b-40aa-9d04-a56814c5e375}

//     const userId = "5cc24c79-3e25-4d64-8da3-a99682d77e25";

//     // const platformData = platforms?.data?.map(platform => ({
//     //   id: platform.id,
//     //   name: platform.name,
//     //   userId: userId,
//     // }));

//     res.json({ success: true, transactionData: getSocialTrasactionData });
//   } catch (error) {
//     console.error("Error fetching Phyllo platforms:", error);
//     res
//       .status(500)
//       .json({
//         success: false,
//         message: "Failed to fetch platforms",
//         error: error.message,
//       });
//   }
// };

module.exports = {
  createPhylloUser,
  createPhylloSDKToken,
  fetchPhylloPlatforms,
  fetchanSocialAccount,
  fetchDataFromdatabase,
  deletePlatformData,
  fetchStateLawFromDatabase,
  fetchDataFromdatabaseAdmin
  // getContent,
  // getPublicationContent,
  // getComments,
  // getSocialTrasactionOfParticularAccount,
};
