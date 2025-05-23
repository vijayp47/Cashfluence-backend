const messages = {
    FETCH_SOCIAL_ACCOUNTS_SUCCESS: "Social account info fetched and saved successfully.",
    FETCH_SOCIAL_ACCOUNTS_ERROR: "Error fetching and saving social accounts.",
    INVALID_QUERY_PARAMS: "'Invalid email or password'",
    USER_CREATED_SUCCESS: "User created successfully.",
    USER_CREATION_FAILED: "Failed to create user.",
    USER_SAVE: "New user data saved to User and InterestRateTable.",
    UserExist: "User already exists",
    ERROR: "Error creating Phyllo user:",
    NAME: "cashfluence",
    USER_CREATE_ERROR: "User not found. Please create a user first.",
    TOKEN_ERROR: "Error creating Phyllo SDK token:",
    ERROR_FETCHING_PLATFORMS: "Error fetching Phyllo platforms:",
    DATABASE_ERROE:'Unable to connect to the database:',
    DATABASE_SYNC:'Error synchronizing database:',
    LOAN_ERROR:'Failed to fetch users with loans',
    ADMIN_DASHBOARD:'Welcome to the admin dashboard!',
    USER_REGISTERED:'User registered successfully. Please verify your email with the OTP sent.',
    REGISTRATION_ERROR:'Server error during registration',
    USER_NOT_FOUND:'User not found, please register' , 
    OTP_INVALID:'Invalid or expired OTP',
    EMAIL_VERIFIED:'Email verified successfully!',
    OTP_VERIFICATION_ERROR:'Server error during OTP verification',
    INVALID_CREDENTIALS:'Invalid credentials',
    LOGIN:'Login successful!',
    LOGIN_ERROR:'Server error during login',
    RESET:'Password Reset',
    PASSWORD_LINK_SENT:'Password reset link sent to email.',
    PASSWORD_LINK_SENT_ERROR:'Server error during forgot password request',
    FORGOT_PASSWORD_ERROR:'Forgot Password error:',
     CHNAGE_PASSWORD_ERROR:'New password cannot be the same as the old password. Please choose a different password.',
     INVALID_TOKEN:'Invalid or expired token',
     PASSWORD_RESET_SUCCESSFULY:'Password has been reset successfully.',
     PASSWORD_RESET_ERROR:'Server error during password reset',
     RESET_ERROR:'Reset Password error:',
     OTP_VERFICATION:'Your OTP for Account Verification',
     USER_EXIST:'User already exists',
     KYC_CREATED:'KYC profile created successfully',
     KYC_ERROR:'Server error while creating KYC profile',
     LOAN_APPLY_ERROR:"Failed to apply for loan",
     FAILED_TO_FETCH_LOAN:'Failed to fetch loans',
     INVALID_STATUS:'Invalid status provided. Must be "Approved" or "Rejected".' ,
     UPDATE_STATUS_FAILED:'Failed to update loan status',
     LOAN_NOT_FOUND:'Loan not found',
     LOAN_DETAIL_ERROR:'Failed to fetch loan details',
     ERROR_SOCIAL_ACCOUNT:"An error occurred while checking the social account.",
     ERROR_SOCIAL_ACCOUNTS:"An error occurred while getting the social account.",
     SOCIAL_ACCOUNT_ERROR:"Error checking/getting social account:",
     MISSING_BODY:"Missing userId or platformName in the request body.",
     DATA_NOT_FOUND:"data not found for this user.",
     DATA_DELETED:"data has been deleted successfully.",
     PLATFORMDATA_ERROR:"Error deleting platform data:",
     PLATFORMDATA_DELETING_ERROR:"An error occurred while deleting platform data.",
     INVALID_PLATFORM:"Invalid platform name.",
     PROCEED_CONNECT:"You can proceed to connect.",
     NO_ACCOUNT:"No accounts found for",
     REQUIRED: "User ID and platform name are required.",
     Exist:"already exists. Please disconnect it before adding a new one.",
     INVALID_FILE:'Invalid file type. Only JPEG, PNG, and PDF are allowed!',
     NO_FILES:'No files uploaded',
     MISSING_FIELDS:'Missing required fields: name, dob, address, employment, or income',
     SAVING_PROFILE_ERROR:'Error uploading files or saving profile:',
     UPLOAD_ERROR:'Error uploading files or saving profile',
     DB_CONNECTION_ERROR:'Unable to connect to the database:',
     ERROR:'Something went wrong!',
     NOTFOUND:'Not Found' ,
     SERVER_PORT:'Server running on port',
     DB_CONNECTED:'PostgreSQL connected',
     NO_TOKEN:'No token, authorization denied',
     MIDDLEWARE_ADMIN_ERROR:'Forbidden: Admins only',
     ACCOUNT_DATA:"Data get successfully!",
     REQUIRED_USER: "User ID and platform name are required.",
     ACCOUNT_DATA_ERROR:"Error while fetching account data",
     REQUIRED_FIELDS: "State, loan term, and loan amount are required.",
     ACCOUNT_DATA_ERRORS: "No data found for the given criteria.",
    
     SOCIAL_ACCOUNT_ERROR: "An error occurred while fetching data.",
     ERROR_SOCIAL_ACCOUNTS: "Failed to retrieve data.",


    


    
  };
  
  module.exports = messages;
  