const { sequelize } = require("../config/db");

const isCompliantState = async (stateName) => {
  if (!stateName) return false;

  try {
    const [results] = await sequelize.query(
        `SELECT 1 FROM "interestRateStateData" WHERE "state_code" = :state LIMIT 1`,
        {
          replacements: { state: stateName.trim() },
          type: sequelize.QueryTypes.SELECT,
        }
      );

    return !!results; // true if a result was found
  } catch (error) {
    console.error("Error checking state compliance:", error);
    return false;
  }
};

const getAllowedInterest = (loanAmount) => {
  if (!loanAmount || isNaN(loanAmount)) return 0;
  return 10 * (loanAmount / 100) + 5;
};

module.exports = { isCompliantState, getAllowedInterest };
