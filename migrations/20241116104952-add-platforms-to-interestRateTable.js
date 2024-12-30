module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('interestRateTable', 'platforms', {
      type: Sequelize.JSONB,
      allowNull: true, // Adjust based on your requirements
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('interestRateTable', 'platforms');
  },
};
