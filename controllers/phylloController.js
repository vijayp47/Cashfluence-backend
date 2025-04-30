// tokenController.js
const axios = require("axios");
const messages = require("../constants/Messages");
const InterestRateTable = require("../models/InterestRateTable");
const InterestRateStateData = require("../models/InterestRateStateData");
const PHYLLO_BASE_URL = process.env.PHYLLO_BASE_URL;
const SANDBOX_TOKEN = process.env.SANDBOX_TOKEN;
const AUTH_TOKEN = `Basic ${SANDBOX_TOKEN}`;
const { Sequelize } = require('../config/db'); 
const { getWeightPercentages } = require("../services/weightService");

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
const calculateAveragesAndQuality = async(contentData, platform) => {
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
  const dbWeights = await getWeightPercentages();
  console.log("dbWeights",dbWeights);
  

  // Define weights for each metric (same for all platforms)


  // Calculate content quality score as a weighted sum of the averages
  const qualityScore =
    averages.avg_like_count * dbWeights.like_count +
    averages.avg_comment_count * dbWeights.comment_count +
    averages.avg_share_count * dbWeights.share_count +
    averages.avg_save_count * dbWeights.save_count +
    averages.avg_impression_organic_count * dbWeights.impression_organic_count +
    averages.avg_reach_organic_count * dbWeights.reach_organic_count;

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

      savedUserId = userRecord.user_id;
    }

    // Step 1: Fetch all platforms
    const platformResponse = await axios.get(`${PHYLLO_BASE_URL}/work-platforms`, {
      auth: {
        username: process.env.PHYLLO_API_USERNAME,
        password: process.env.PHYLLO_API_PASSWORD,
      },
      headers: {
        Authorization: AUTH_TOKEN,
      },
    });

    const platforms = platformResponse.data?.data || [];

    // Step 2: Fetch all accounts linked to this user
    const accountsResponse = await axios.get(`${PHYLLO_BASE_URL}/accounts?user_id=${savedUserId}`, {
      auth: {
        username: process.env.PHYLLO_API_USERNAME,
        password: process.env.PHYLLO_API_PASSWORD,
      },
      headers: {
        Authorization: AUTH_TOKEN,
      },
    });

    const accounts = accountsResponse.data?.data || [];

    // Step 3: Simplify and filter platform data
    const platformsToInclude = ["Instagram", "YouTube", "TikTok"];

    const simplifiedPlatforms = platforms
      .filter((platform) => platformsToInclude.includes(platform.name))
      .map((platform) => {
        const products = platform.products || {};
        const supportedProducts = Object.keys(products).filter(
          (key) => products[key]?.is_supported
        );

        const linkedAccounts = accounts
          .filter((account) => account.work_platform?.id === platform.id)
          .map((account) => ({
            username: account.username,
            identity_status: account.data?.identity?.status || null,
            engagement_status: account.data?.engagement?.status || null,
            audience_status: account.data?.identity?.audience?.status || null,
            income_status: account.data?.income?.status || null,
          }));

        return {
          platform_id: platform.id,
          platform_name: platform.name,
          products: supportedProducts,
          accounts: linkedAccounts,
        };
      });

    // Step 4: Save to DB
    await InterestRateTable.update(
      {
        platforms: simplifiedPlatforms,
        updated_at: new Date(),
      },
      {
        where: { user_id: savedUserId },
      }
    );

    return res.json({ success: true, platforms: simplifiedPlatforms });

  } catch (error) {
    console.error(messages?.ERROR_FETCHING_PLATFORMS, error);
    return res.status(500).json({
      success: false,
      message: messages?.ERROR_FETCHING_PLATFORMS,
      error: error.message,
    });
  }
};





// const fetchanSocialAccount = async (req, res) => {
//   try {
//     const { work_platform_id, user_id, limit, platformName } = req?.query;  

//     // Fetch accounts and profiles data
//     const [accountsResponse, profilesResponse] = await Promise.all([
//       axios.get(`${PHYLLO_BASE_URL}/accounts`, {
//         params: { work_platform_id, user_id, limit, offset: 0 },
//         auth: {
//           username: process.env.PHYLLO_API_USERNAME,
//           password: process.env.PHYLLO_API_PASSWORD,
//         },
//         headers: { Authorization: AUTH_TOKEN },
//       }),
//       axios.get(`${PHYLLO_BASE_URL}/profiles`, {
//         params: { work_platform_id, user_id, limit, offset: 0 },
//         auth: {
//           username: process.env.PHYLLO_API_USERNAME,
//           password: process.env.PHYLLO_API_PASSWORD,
//         },
//         headers: { Authorization: AUTH_TOKEN },
//       }),
//     ]);

//     const account = accountsResponse.data.data[0];
//     const matchedProfile = profilesResponse.data.data[0];
//  const platformFields = {
//       Instagram: { fields: ["follower_count", "following_count"] },
//       YouTube: {
//         fields: ["watch_time_in_hours", "average_open_rate"],
//         extra: { is_verified: matchedProfile.is_verified },
//       },
//       TikTok: {
//         fields: ["follower_count", "following_count", "watch_time_in_hours", "average_open_rate"],
//         extra: { is_verified: matchedProfile.is_verified },
//       },
//     };

//     let accountDetails = {
//       username: matchedProfile.username,
//       subscriber_count: matchedProfile.reputation.subscriber_count,
//       paid_subscriber_count: matchedProfile.reputation.paid_subscriber_count,
//       content_count: matchedProfile.reputation.content_count,
//       like_count: matchedProfile.reputation.like_count,
//       is_business: matchedProfile.is_business,
//       platform_profile_name: matchedProfile.platform_profile_name,
//       connection_count: matchedProfile.connection_count,
//       work_experiences: matchedProfile.work_experiences,
//       ...(platformFields[platformName]?.fields || []).reduce((acc, field) => {
//         acc[field] = matchedProfile.reputation[field];
//         return acc;
//       }, {}),
//       ...platformFields[platformName]?.extra,
//     };

  

//     const contentResponse = await axios.get(`${PHYLLO_BASE_URL}/social/contents`, {
//       params: {
//         account_id: account.id,
//         user_id,
//         from_date: "2021-01-01",
//         to_date: new Date().toISOString().split("T")[0],
//         limit,
//         offset: 0,
//       },
//       auth: {
//         username: process.env.PHYLLO_API_USERNAME,
//         password: process.env.PHYLLO_API_PASSWORD,
//       },
//       headers: { Authorization: AUTH_TOKEN },
//     });

//     if (contentResponse?.data?.data?.length > 0) {
//       contentResponse?.data?.data?.forEach((item) => {
//         const platform = item?.work_platform?.name;
//         const result = calculateAveragesAndQuality(contentResponse?.data, platform);
//    if (platform === "TikTok") {
//           accountDetails = {
//             ...accountDetails,
//             average_like_count: result?.averages?.avg_like_count,
//             average_dislike_count: result?.averages?.avg_dislike_count,
//             average_comment_count: result?.averages?.avg_comment_count,
//             average_impression_organic_count: result?.averages?.avg_impression_organic_count,
//             average_reach_organic_count: result?.averages?.avg_reach_organic_count,
//             average_save_count: result?.averages?.avg_save_count,
//             average_view_count: result?.averages?.avg_view_count,
//             average_replay_count: result?.averages?.avg_replay_count,
//             average_watch_time_in_hour: result?.averages?.avg_watch_time_in_hour,
//             average_share_count: result?.averages?.avg_share_count,
//             average_unsubscribe_count: result?.averages?.avg_unsubscribe_count,
//             average_spam_report_count: result?.averages?.avg_spam_report_count,
//             average_content_quality_score: result.contentQualityScore,
//           };
//         } else if (platform === "Instagram") {
//           accountDetails = {
//             ...accountDetails,
//             average_like_count: result?.averages?.avg_like_count,
//             average_dislike_count: result?.averages?.avg_dislike_count,
//             average_comment_count: result?.averages?.avg_comment_count,
//             average_impression_organic_count: result?.averages?.avg_impression_organic_count,
//             average_reach_organic_count: result?.averages?.avg_reach_organic_count,
//             average_save_count: result?.averages?.avg_save_count,
//             average_view_count: result?.averages?.avg_view_count,
//             average_replay_count: result?.averages?.avg_replay_count,
//             average_watch_time_in_hour: result?.averages?.avg_watch_time_in_hour,
//             average_share_count: result?.averages?.avg_share_count,
//             average_unsubscribe_count: result?.averages?.avg_unsubscribe_count,
//             average_spam_report_count: result?.averages?.avg_spam_report_count,
//             average_content_quality_score: result.contentQualityScore,
//           };
//         } else if (platform === "YouTube") {
//           accountDetails = {
//             ...accountDetails,
//             average_like_count: result?.averages?.avg_like_count,
//             average_dislike_count: result?.averages?.avg_dislike_count,
//             average_comment_count: result?.averages?.avg_comment_count,
//             average_impression_organic_count: result?.averages?.avg_impression_organic_count,
//             average_reach_organic_count: result?.averages?.avg_reach_organic_count,
//             average_save_count: result?.averages?.avg_save_count,
//             average_view_count: result?.averages?.avg_view_count,
//             average_replay_count: result?.averages?.avg_replay_count,
//             average_watch_time_in_hour: result?.averages?.avg_watch_time_in_hour,
//             average_share_count: result?.averages?.avg_share_count,
//             average_unsubscribe_count: result?.averages?.avg_unsubscribe_count,
//             average_spam_report_count: result?.averages?.avg_spam_report_count,
//             average_content_quality_score: result.contentQualityScore,
//           };
//         }
//       });
//     } else {
//       console.log("No data available to calculate averages.");
//     }

//     // Fetch income data
//     const incomeResponse = await axios.get(`${PHYLLO_BASE_URL}/social/income/payouts`, {
//       params: {
//         user_id,
//         account_id: account.id,
//         payout_from_date: "2021-01-01",
//         payout_to_date: new Date().toISOString().split("T")[0],
//         limit,
//         offset: 0,
//       },
//       auth: {
//         username: process.env.PHYLLO_API_USERNAME,
//         password: process.env.PHYLLO_API_PASSWORD,
//       },
//       headers: { Authorization: AUTH_TOKEN },
//     });
//     // const income = {
//     //   "data": [
//     //     {
//     //       "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
//     //       "created_at": "2020-03-27T12:56:34.534978",
//     //       "updated_at": "2020-03-27T12:56:34.534978",
//     //       "user": {
//     //         "id": "fb83e3ca-eae7-4eaa-bf51-601ea4b3daeb",
//     //         "name": "John Doe"
//     //       },
//     //       "account": {
//     //         "id": "fb83e3ca-eae7-4eaa-bf51-601ea4b3daeb",
//     //         "platform_username": "john.doe@gmail.com"
//     //       },
//     //       "work_platform": {
//     //         "id": "fb83e3ca-eae7-4eaa-bf51-601ea4b3daeb",
//     //         "name": "Instagram",
//     //         "logo_url": "https://getphyllo.com/storage/instagram.png"
//     //       },
//     //       "amount": 123.45,
//     //       "currency": "USD",
//     //       "status": "SCHEDULED",
//     //       "payout_interval": "AUTOMATIC_DAILY",
//     //       "bank_details": {
//     //         "name": "string",
//     //         "account_last_digits": "string",
//     //         "account_routing_number": "string"
//     //       },
//     //       "external_id": "5790fbc3-b022-437b-abf8-0492c7a82056",
//     //       "payout_at": "2020-03-27T12:56:34.534978",
//     //       "platform_profile_id": "UCEyLTzBtHJhlUwkeWhxfMXw",
//     //       "platform_profile_name": "Peter Parker"
//     //     }
//     //   ],
//     //   "metadata": [
//     //     {
//     //       "offset": 0,
//     //       "limit": 10,
//     //       "from_date": "2020-12-31",
//     //       "to_date": "2021-12-31"
//     //     }
//     //   ]
//     // };

//     const incomeData = incomeResponse?.data[0]; 

//     // Check if income data exists
//     if (incomeResponse?.data?.length > 0) {
//       const platform = incomeData?.work_platform?.name; // Platform name from income data
//       const queryPlatform = platformName; // Platform name from query params
    
//       // Ensure that the platform in the query matches the platform in the income data
//       if (platform === queryPlatform) {
//         // Check platform and add the income details accordingly
      
//           accountDetails = {
//             ...accountDetails,
//               income_amount: incomeData?.amount,
//               income_currency: incomeData?.currency,
//               income_status: incomeData?.status,
//               income_type: incomeData?.type,
//               income_payout_interval: incomeData?.payout_interval,
//           }
//       }
//     }
    

//     // Update database with demographics for all supported platforms
//     const existingAccount = await InterestRateTable.findOne({
//       where: { user_id },
//     });

//     const updatedAccountInfo = {
//       user_id,
//       instagram_data:
//         platformName === "Instagram"
//           ? accountDetails
//           : existingAccount?.instagram_data,
//       youtube_data:
//         platformName === "YouTube"
//           ? accountDetails
//           : existingAccount?.youtube_data,
//       tiktok_data:
//         platformName === "TikTok"
//           ? accountDetails
//           : existingAccount?.tiktok_data,
//       // Add other platforms' columns here as needed
//     };

//     await existingAccount.update(updatedAccountInfo);

//     return res.status(200).json({ message: "Account data updated successfully!" });
//   } catch (error) {
//     console.error("Error updating account data:", error);
//     return res.status(500).json({ error: "Failed to update account data" });
//   }
// };

const fetchanSocialAccount = async (req, res) => {
  try {
    const { work_platform_id, user_id, limit, platformName } = req?.query;

    // Fetch accounts and profiles data
    const [accountsResponse, profilesResponse] = await Promise.all([
      axios.get(`${PHYLLO_BASE_URL}/accounts?status=CONNECTED`, {
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

    // Array to hold multiple account details
    const accountDetailsList = [];
    
    const accounts = accountsResponse.data.data;

// Filter accounts with status 'CONNECTED'
const connectedAccounts = accounts.filter(account => account.status === 'CONNECTED');
    const profiles = profilesResponse?.data?.data;
    console.log("profiles",profiles);
    console.log("accounts",accounts);
    console.log("accounts-length",accounts?.length);
    
   // Define platform fields (this can be expanded based on platform)
    const platformFields = {
      Instagram: { fields: ["follower_count", "following_count"] },
      YouTube: { fields: ["watch_time_in_hours", "average_open_rate"] },
      TikTok: { fields: ["follower_count", "following_count", "watch_time_in_hours", "average_open_rate"] },
    };

    // Iterate through accounts to gather the datay
    for (let i = 0; i < connectedAccounts.length; i++) {
      const account = connectedAccounts[i];
      
      const matchedProfile = profiles.find(profile => {
        console.log('Checking profile:', profile);
        console.log('account?.id', account?.id);
        console.log('profile.account?.id?.id',profile.account?.id);
        return profile.account?.id === account.id;
      });
       // Match using account.id or another identifier

      console.log("matchedProfile", matchedProfile);

      if (!matchedProfile) {
        console.log(`Profile not found for account ${account.id}`);
        continue;  // Skip if no matched profile found
      }
      
      let accountDetails = {
        account_id: account?.id,
        username: matchedProfile?.username,
        subscriber_count: matchedProfile?.reputation?.subscriber_count,
        paid_subscriber_count: matchedProfile?.reputation?.paid_subscriber_count,
        content_count: matchedProfile?.reputation?.content_count,
        like_count: matchedProfile?.reputation?.like_count,
        is_business: matchedProfile?.is_business,
        platform_profile_name: matchedProfile?.platform_profile_name,
        connection_count: matchedProfile?.connection_count,
        work_experiences: matchedProfile?.work_experiences,
        is_verified: matchedProfile?.is_verified,
        is_business: matchedProfile?.is_business,
        ...(platformFields[platformName]?.fields || []).reduce((acc, field) => {
          acc[field] = matchedProfile.reputation[field];
          return acc;
        }, {}),
        ...platformFields[platformName]?.extra,
      };

      // Fetch content data for the account
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

      // if (contentResponse?.data?.data?.length > 0) {
        contentResponse?.data?.data?.forEach(async(item) => {
          const platform = item?.work_platform?.name;
          const result = await calculateAveragesAndQuality(contentResponse?.data, platform);
         console.log("resultresultresultresult",result);
         
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
              average_content_quality_score: result?.contentQualityScore,
            };
          }
        });
      // } else {
      //   console.log("No data available to calculate averages.");
      // }

      // Fetch income data for the account
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
      const incomeData = incomeResponse?.data[0];
    //       const incomeResponse = {
    //   "data": [
    //     {
    //       "id": "497f6eca-6276-4993-bfeb-53cbbbba6f08",
    //       "created_at": "2020-03-27T12:56:34.534978",
    //       "updated_at": "2020-03-27T12:56:34.534978",
    //       "user": {
    //         "id": "fb83e3ca-eae7-4eaa-bf51-601ea4b3daeb",
    //         "name": "John Doe"
    //       },
    //       "account": {
    //         "id": "fb83e3ca-eae7-4eaa-bf51-601ea4b3daeb",
    //         "platform_username": "john.doe@gmail.com"
    //       },
    //       "work_platform": {
    //         "id": "fb83e3ca-eae7-4eaa-bf51-601ea4b3daeb",
    //         "name": "Instagram",
    //         "logo_url": "https://getphyllo.com/storage/instagram.png"
    //       },
    //       "amount": 123.45,
    //       "currency": "USD",
    //       "status": "SCHEDULED",
    //       "payout_interval": "AUTOMATIC_DAILY",
    //       "bank_details": {
    //         "name": "string",
    //         "account_last_digits": "string",
    //         "account_routing_number": "string"
    //       },
    //       "external_id": "5790fbc3-b022-437b-abf8-0492c7a82056",
    //       "payout_at": "2020-03-27T12:56:34.534978",
    //       "platform_profile_id": "UCEyLTzBtHJhlUwkeWhxfMXw",
    //       "platform_profile_name": "Peter Parker"
    //     }
    //   ],
    //   "metadata": [
    //     {
    //       "offset": 0,
    //       "limit": 10,
    //       "from_date": "2020-12-31",
    //       "to_date": "2021-12-31"
    //     }
    //   ]
    // };

    // const incomeData = incomeResponse?.data[0]; 
    // console.log("incomeData-----",incomeData);
    
      if (incomeResponse?.data?.length > 0) {
        const platform = incomeData?.work_platform?.name;
        const queryPlatform = platformName;
      
        if (platform === queryPlatform) {
          console.log("inside");
          
          accountDetails = {
            ...accountDetails,
            income_amount: incomeData?.amount,
            income_currency: incomeData?.currency,
            income_status: incomeData?.status,
            income_type: incomeData?.type,
            income_payout_interval: incomeData?.payout_interval,
          };
        }
      }
      console.log("accountDetails",accountDetails);
      // Add the account details to the list
      accountDetailsList.push(accountDetails);
    }

    // Update the database with multiple accounts data for all platforms
    const existingAccount = await InterestRateTable.findOne({
      where: { user_id },
    });

    const updatedAccountInfo = {
      user_id,
      instagram_data:
        platformName === "Instagram"
          ? accountDetailsList
          : existingAccount?.instagram_data,
      youtube_data:
        platformName === "YouTube"
          ? accountDetailsList
          : existingAccount?.youtube_data,
      tiktok_data:
        platformName === "TikTok"
          ? accountDetailsList
          : existingAccount?.tiktok_data,
    };

    await existingAccount.update(updatedAccountInfo);

    return res.status(200).json({ message: "Account data updated successfully!" });
  } catch (error) {
    console.error("Error updating account data:", error);
    return res.status(500).json({ error: "Failed to update account data" });
  }
};


// const fetchanSocialAccount = async (req, res) => {
//   try {
//     const { work_platform_id, user_id, limit, platformName } = req?.query;

//     // Fetch accounts and profiles data
//     const [accountsResponse, profilesResponse] = await Promise.all([
//       axios.get(`${PHYLLO_BASE_URL}/accounts`, {
//         params: { work_platform_id, user_id, limit, offset: 0 },
//         auth: {
//           username: process.env.PHYLLO_API_USERNAME,
//           password: process.env.PHYLLO_API_PASSWORD,
//         },
//         headers: { Authorization: AUTH_TOKEN },
//       }),
//       axios.get(`${PHYLLO_BASE_URL}/profiles`, {
//         params: { work_platform_id, user_id, limit, offset: 0 },
//         auth: {
//           username: process.env.PHYLLO_API_USERNAME,
//           password: process.env.PHYLLO_API_PASSWORD,
//         },
//         headers: { Authorization: AUTH_TOKEN },
//       }),
//     ]);

//     const accountDetailsList = []; // Array to hold multiple account details
//     const accounts = accountsResponse.data.data;
//     const profiles = profilesResponse.data.data;

//     const platformFields = {
//       Instagram: { fields: ["follower_count", "following_count"] },
//       YouTube: {
//         fields: ["watch_time_in_hours", "average_open_rate"],
//       },
//       TikTok: {
//         fields: ["follower_count", "following_count", "watch_time_in_hours", "average_open_rate"],
//       },
//     };

//     // Iterate through accounts
//     for (let i = 0; i < accounts.length; i++) {
//       const account = accounts[i];
//       const matchedProfile = profiles[i];

//       let accountDetails = {
//         username: matchedProfile.username,
//         subscriber_count: matchedProfile.reputation.subscriber_count,
//         paid_subscriber_count: matchedProfile.reputation.paid_subscriber_count,
//         content_count: matchedProfile.reputation.content_count,
//         like_count: matchedProfile.reputation.like_count,
//         is_business: matchedProfile.is_business,
//         platform_profile_name: matchedProfile.platform_profile_name,
//         connection_count: matchedProfile.connection_count,
//         work_experiences: matchedProfile.work_experiences,
//         ...(platformFields[platformName]?.fields || []).reduce((acc, field) => {
//           acc[field] = matchedProfile.reputation[field];
//           return acc;
//         }, {}),
//         ...platformFields[platformName]?.extra,
//       };

//       // Fetch content data for the account
//       const contentResponse = await axios.get(`${PHYLLO_BASE_URL}/social/contents`, {
//         params: {
//           account_id: account.id,
//           user_id,
//           from_date: "2021-01-01",
//           to_date: new Date().toISOString().split("T")[0],
//           limit,
//           offset: 0,
//         },
//         auth: {
//           username: process.env.PHYLLO_API_USERNAME,
//           password: process.env.PHYLLO_API_PASSWORD,
//         },
//         headers: { Authorization: AUTH_TOKEN },
//       });

//       if (contentResponse?.data?.data?.length > 0) {
//         contentResponse?.data?.data?.forEach((item) => {
//           const platform = item?.work_platform?.name;
//           const result = calculateAveragesAndQuality(contentResponse?.data, platform);

//           if (platform === "TikTok") {
//             accountDetails = {
//               ...accountDetails,
//               average_like_count: result?.averages?.avg_like_count,
//               average_dislike_count: result?.averages?.avg_dislike_count,
//               average_comment_count: result?.averages?.avg_comment_count,
//               average_impression_organic_count: result?.averages?.avg_impression_organic_count,
//               average_reach_organic_count: result?.averages?.avg_reach_organic_count,
//               average_save_count: result?.averages?.avg_save_count,
//               average_view_count: result?.averages?.avg_view_count,
//               average_replay_count: result?.averages?.avg_replay_count,
//               average_watch_time_in_hour: result?.averages?.avg_watch_time_in_hour,
//               average_share_count: result?.averages?.avg_share_count,
//               average_unsubscribe_count: result?.averages?.avg_unsubscribe_count,
//               average_spam_report_count: result?.averages?.avg_spam_report_count,
//               average_content_quality_score: result.contentQualityScore,
//             };
//           } else if (platform === "Instagram") {
//             accountDetails = {
//               ...accountDetails,
//               average_like_count: result?.averages?.avg_like_count,
//               average_dislike_count: result?.averages?.avg_dislike_count,
//               average_comment_count: result?.averages?.avg_comment_count,
//               average_impression_organic_count: result?.averages?.avg_impression_organic_count,
//               average_reach_organic_count: result?.averages?.avg_reach_organic_count,
//               average_save_count: result?.averages?.avg_save_count,
//               average_view_count: result?.averages?.avg_view_count,
//               average_replay_count: result?.averages?.avg_replay_count,
//               average_watch_time_in_hour: result?.averages?.avg_watch_time_in_hour,
//               average_share_count: result?.averages?.avg_share_count,
//               average_unsubscribe_count: result?.averages?.avg_unsubscribe_count,
//               average_spam_report_count: result?.averages?.avg_spam_report_count,
//               average_content_quality_score: result.contentQualityScore,
//             };
//           } else if (platform === "YouTube") {
//             accountDetails = {
//               ...accountDetails,
//               average_like_count: result?.averages?.avg_like_count,
//               average_dislike_count: result?.averages?.avg_dislike_count,
//               average_comment_count: result?.averages?.avg_comment_count,
//               average_impression_organic_count: result?.averages?.avg_impression_organic_count,
//               average_reach_organic_count: result?.averages?.avg_reach_organic_count,
//               average_save_count: result?.averages?.avg_save_count,
//               average_view_count: result?.averages?.avg_view_count,
//               average_replay_count: result?.averages?.avg_replay_count,
//               average_watch_time_in_hour: result?.averages?.avg_watch_time_in_hour,
//               average_share_count: result?.averages?.avg_share_count,
//               average_unsubscribe_count: result?.averages?.avg_unsubscribe_count,
//               average_spam_report_count: result?.averages?.avg_spam_report_count,
//               average_content_quality_score: result.contentQualityScore,
//             };
//           }
//         });
//       } else {
//         console.log("No data available to calculate averages.");
//       }

//       // Fetch income data for the account
//       const incomeResponse = await axios.get(`${PHYLLO_BASE_URL}/social/income/payouts`, {
//         params: {
//           user_id,
//           account_id: account.id,
//           payout_from_date: "2021-01-01",
//           payout_to_date: new Date().toISOString().split("T")[0],
//           limit,
//           offset: 0,
//         },
//         auth: {
//           username: process.env.PHYLLO_API_USERNAME,
//           password: process.env.PHYLLO_API_PASSWORD,
//         },
//         headers: { Authorization: AUTH_TOKEN },
//       });

//       const incomeData = incomeResponse?.data[0];
//       if (incomeResponse?.data?.length > 0) {
//         const platform = incomeData?.work_platform?.name;
//         const queryPlatform = platformName;

//         if (platform === queryPlatform) {
//           accountDetails = {
//             ...accountDetails,
//             income_amount: incomeData?.amount,
//             income_currency: incomeData?.currency,
//             income_status: incomeData?.status,
//             income_type: incomeData?.type,
//             income_payout_interval: incomeData?.payout_interval,
//           };
//         }
//       }

//       // Add the account details to the list
//       accountDetailsList.push(accountDetails);
//     }

//     // If more than 1 account, calculate averages
//     if (accountDetailsList.length > 1) {
//       const averagedData = calculateAverages(accountDetailsList);

//       // Update the database with averaged data
//       const existingAccount = await InterestRateTable.findOne({
//         where: { user_id },
//       });

//       const updatedAccountInfo = {
//         user_id,
//         instagram_data:
//           platformName === "Instagram"
//             ? averagedData
//             : existingAccount?.instagram_data,
//         youtube_data:
//           platformName === "YouTube"
//             ? averagedData
//             : existingAccount?.youtube_data,
//         tiktok_data:
//           platformName === "TikTok"
//             ? averagedData
//             : existingAccount?.tiktok_data,
//       };

//       await existingAccount.update(updatedAccountInfo);
//     } else {
//       // If only one account, save as is
//       const existingAccount = await InterestRateTable.findOne({
//         where: { user_id },
//       });

//       const updatedAccountInfo = {
//         user_id,
//         instagram_data:
//           platformName === "Instagram"
//             ? accountDetailsList[0]
//             : existingAccount?.instagram_data,
//         youtube_data:
//           platformName === "YouTube"
//             ? accountDetailsList[0]
//             : existingAccount?.youtube_data,
//         tiktok_data:
//           platformName === "TikTok"
//             ? accountDetailsList[0]
//             : existingAccount?.tiktok_data,
//       };

//       await existingAccount.update(updatedAccountInfo);
//     }

//     return res.status(200).json({ message: "Account data updated successfully!" });
//   } catch (error) {
//     console.error("Error updating account data:", error);
//     return res.status(500).json({ error: "Failed to update account data" });
//   }
// };

const fetchConnectedAccountNames = async (req, res) => {
  const { userId } = req.params;

  try {
    const user = await InterestRateTable.findOne({ where: { user_id: userId } });

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const connectedPlatforms = [];

    // Check if the platform data exists and is non-null or non-empty
    if (user.instagram_data && Object.keys(user.instagram_data).length > 0) {
      connectedPlatforms.push('Instagram');
    }
    if (user.youtube_data && Object.keys(user.youtube_data).length > 0) {
      connectedPlatforms.push('YouTube');
    }
    if (user.tiktok_data && Object.keys(user.tiktok_data).length > 0) {
      connectedPlatforms.push('TikTok');
    }

    return res.json({ connectedPlatforms }); // Return the list of connected platforms
  } catch (error) {
    console.error('Error fetching platform data:', error);
    return res.status(500).json({ message: 'Internal Server Error' });
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
  const { userId, platformName, accountId } = req.body;

  // Validate incoming data
  if (!userId || !platformName || !accountId) {
    return res.status(400).json({
      success: false,
      message: "Missing required data: userId, platformName, accountId",
    });
  }

  // Determine the column name in the database based on the platform
  const platformColumn = `${platformName?.toLowerCase()}_data`;
  console.log("Platform Column:", platformColumn);

  try {
    // Step 1: Attempt to disconnect the account using the Phyllo API (check if it is already disconnected)
    console.log(`Attempting to disconnect account: ${accountId} from platform: ${platformName}`);
//     const disconnectResponse = await axios.post(
//       `${PHYLLO_BASE_URL}/accounts/${accountId}/disconnect`,
//       {}, // Empty body if not required
//       {
//         auth: {
//           username: process.env.PHYLLO_API_USERNAME, 
//           password: process.env.PHYLLO_API_PASSWORD, 
//         },
//         headers: {
//           "Content-Type": "application/json",
//         },
//       }
//     );
// console.log("disconnectResponse",disconnectResponse);

//     // Step 2: Handle 403 Forbidden - Account already disconnected
//     if (disconnectResponse.status === 403) {
//       console.log("Account is already disconnected.");
//     } else if (disconnectResponse.status !== 200) {
//       console.error("Error disconnecting account:", disconnectResponse);
//       return res.status(500).json({
//         success: false,
//         message: `Failed to disconnect ${platformName} account.`,
//       });
//     } else {
//       console.log(`Successfully disconnected account: ${accountId} from platform: ${platformName}`);
//     }

    // Step 3: Proceed with deleting the platform data from the database
    console.log("Fetching user data to delete platform data...");
    const InterestRateTableData = await InterestRateTable.findOne({
      where: { user_id: userId },
    });

    if (!InterestRateTableData) {
      console.log("User not found:", userId);
      return res.status(404).json({
        success: false,
        message: `User with userId ${userId} not found.`,
      });
    }

    console.log("Platform data for", platformName, "found in user data:", InterestRateTableData[platformColumn]);

    if (!InterestRateTableData[platformColumn]) {
      console.log(`${platformName} data not found for user.`);
      return res.status(404).json({
        success: false,
        message: `${platformName} data not found.`,
      });
    }

    // Step 4: Iterate over the platform data and remove the account by accountId
    console.log(`Removing account with accountId: ${accountId} from ${platformColumn}`);
    const updatedPlatformData = InterestRateTableData[platformColumn].filter(
      (account) => account.account_id !== accountId
    );
    console.log("Updated platform data:", updatedPlatformData);

    // Step 5: If no matching account is found to delete, return an error
    if (updatedPlatformData.length === InterestRateTableData[platformColumn].length) {
      console.log("Account not found in the platform data:", accountId);
      return res.status(404).json({
        success: false,
        message: `Account with account_id ${accountId} not found.`,
      });
    }

    // Step 6: Update the platform-specific data field with the new data (after deletion)
    InterestRateTableData[platformColumn] = updatedPlatformData;
    console.log("Saving updated platform data...");
    await InterestRateTableData.save();

    // Step 7: Return a success response
    console.log(`Successfully deleted ${platformName} account data for accountId: ${accountId}`);
    return res.status(200).json({
      success: true,
      message: `${platformName} account data deleted successfully.`,
    });
  } catch (error) {
    console.error("Error deleting platform data:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while deleting platform data.",
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
  fetchDataFromdatabaseAdmin,
  fetchConnectedAccountNames,

  // getContent,
  // getPublicationContent,
  // getComments,
  // getSocialTrasactionOfParticularAccount,
};
